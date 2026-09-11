'use client';

/**
 * useSharedBooking – Universal booking hook.
 *
 * Shared by patient self-service and staff-assisted flows.
 * Role-specific context (who the subject patient is, verification reference,
 * audit metadata) is injected via BookingContext.
 *
 * Security invariants:
 * - Hold and commit mutations always generate a new idempotency key.
 * - Outcome-unknown is resolved by polling the idempotency key endpoint.
 * - CONFIRMED state is ONLY reachable via authoritative server commit response.
 * - Realtime events update display state only – never set CONFIRMED.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Slot, Booking, BookingAttemptState, ApiError, BookingContext } from '@/types/booking';
import {
  transition,
  isBusyState,
  isTerminalState,
} from '@/features/booking/state-machine';
import {
  createHold,
  commitHold,
  cancelBooking,
  getAlternatives,
  getBookingAttempt,
  rescheduleBooking,
} from '@/lib/api/booking-client';

// ── Options ────────────────────────────────────────────────────────────────────

export interface UseSharedBookingOptions {
  selectedClinicId: string;
  selectedTypeId: string;
  bookingContext: BookingContext;
  onAvailabilityRefetch?: () => Promise<unknown>;
}

// ── Return value ──────────────────────────────────────────────────────────────

export interface UseSharedBookingResult {
  attempt: BookingAttemptState;
  selected?: Slot;
  hold?: { id: string; expiresAt: string; commitKey: string };
  seconds: number;
  alternatives: Slot[];
  booking?: Booking;
  message: string;
  busy: boolean;
  /** Whether outcome polling is in progress */
  resolving: boolean;
  /** Live announcement text for aria-live region */
  announcement: string;
  choose: (slot: Slot) => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
  reschedule: (bookingId: string, newSlotId: string) => Promise<void>;
  reset: () => Promise<void>;
}

// ── Hook implementation ───────────────────────────────────────────────────────

const messageFor = (error: unknown): string =>
  (error as ApiError).message ??
  'We could not complete that request. Please try again.';

/** Bounded exponential backoff for outcome polling. */
const pollDelays = [1_000, 2_000, 4_000, 8_000, 10_000]; // max 10s

export function useSharedBooking({
  selectedClinicId,
  selectedTypeId,
  bookingContext,
  onAvailabilityRefetch,
}: UseSharedBookingOptions): UseSharedBookingResult {
  const [attempt, setAttempt] = useState<BookingAttemptState>('IDLE');
  const [selected, setSelected] = useState<Slot>();
  const [hold, setHold] = useState<{ id: string; expiresAt: string; commitKey: string }>();
  const [seconds, setSeconds] = useState(0);
  const [alternatives, setAlternatives] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Booking>();
  const [message, setMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [resolving, setResolving] = useState(false);

  // Refs to avoid stale closures in timers
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  const idempotencyKeyRef = useRef<string>('');

  // ── Helpers ──────────────────────────────────────────────────────────────

  const applyTransition = useCallback(
    (event: Parameters<typeof transition>[1]) => {
      const current = attemptRef.current;
      const next = transition(current, event);
      if (next !== null) setAttempt(next);
      return next;
    },
    [],
  );

  const announce = useCallback((text: string) => {
    setAnnouncement('');
    // Flicker to force screen readers to pick up the change
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);

  // ── Hold countdown timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (!hold || attempt !== 'HELD') return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1_000),
      );
      setSeconds(remaining);

      if (remaining === 0) {
        applyTransition({ type: 'HOLD_EXPIRED' });
        const msg = 'Your temporary reservation expired. Check live availability and choose another time.';
        setMessage(msg);
        announce('Reservation expired. Please choose a new time.');
      } else if (remaining === 60) {
        announce(`Reservation expires in ${remaining} seconds.`);
      }
    };

    tick();
    const timer = setInterval(tick, 1_000);
    return () => clearInterval(timer);
  }, [hold, attempt, applyTransition, announce]);

  // ── Outcome polling (PENDING_RESOLUTION) ─────────────────────────────────

  useEffect(() => {
    if (attempt !== 'PENDING_RESOLUTION') {
      setResolving(false);
      return;
    }
    setResolving(true);

    let cancelled = false;
    let pollIndex = 0;

    const poll = async () => {
      if (cancelled) return;
      const key = idempotencyKeyRef.current;

      try {
        const result = await getBookingAttempt(key);
        if (cancelled) return;

        if (result) {
          setBooking(result);
          applyTransition({ type: 'ATTEMPT_CONFIRMED' });
          setMessage('');
          announce('Your appointment has been confirmed.');
          setResolving(false);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        const apiError = err as ApiError;
        if (apiError.code === 'BOOKING_OUTCOME_RACE_LOST' || apiError.bookingCreated === false) {
          applyTransition({ type: 'ATTEMPT_RACE_LOST' });
          setMessage(apiError.message || 'That appointment was taken by another patient. No booking was created for you.');
          announce('Appointment unavailable. Please choose an alternative time.');
          setResolving(false);
          return;
        }
      }

      // Still pending
      applyTransition({ type: 'STILL_PENDING' });

      if (pollIndex < pollDelays.length - 1) {
        pollIndex++;
      }

      // Schedule next poll
      const delay = pollDelays[Math.min(pollIndex, pollDelays.length - 1)];
      setTimeout(poll, delay);
    };

    // Start first poll after 1 second
    const timer = setTimeout(poll, pollDelays[0]);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt, applyTransition, announce]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const reset = useCallback(async () => {
    setMessage('');
    setAttempt('IDLE');
    setSelected(undefined);
    setHold(undefined);
    setAlternatives([]);
    setBooking(undefined);
    setSeconds(0);
    setAnnouncement('');
    idempotencyKeyRef.current = '';
    await onAvailabilityRefetch?.();
  }, [onAvailabilityRefetch]);

  const choose = useCallback(async (slot: Slot) => {
    if (isBusyState(attemptRef.current)) return;

    setSelected(slot);
    setMessage('');
    applyTransition({ type: 'HOLD_REQUESTED' });
    announce(`Requesting hold for ${slot.appointmentType} appointment.`);

    const holdKey = crypto.randomUUID();
    idempotencyKeyRef.current = holdKey;

    try {
      const result = await createHold(slot.slotId, holdKey);
      setHold({
        id: result.holdId,
        expiresAt: result.expiresAt,
        commitKey: crypto.randomUUID(), // Separate idempotency key for commit
      });
      applyTransition({ type: 'HOLD_SUCCEEDED' });
      announce(`Appointment time held. Confirm within ${Math.ceil((new Date(result.expiresAt).getTime() - Date.now()) / 60_000)} minutes.`);
      await onAvailabilityRefetch?.();
    } catch (err) {
      const apiError = err as ApiError;
      setMessage(messageFor(err));
      if (apiError.code === 'SLOT_UNAVAILABLE' || apiError.code === 'SLOT_NOT_AVAILABLE') {
        applyTransition({ type: 'SLOT_UNAVAILABLE' });
        announce('That appointment is no longer available. Showing alternatives.');
        setAlternatives(await getAlternatives(selectedClinicId, selectedTypeId).catch(() => []));
      } else if (apiError.retryable) {
        applyTransition({ type: 'RETRYABLE_ERROR' });
      } else {
        applyTransition({ type: 'TERMINAL_ERROR' });
      }
      await onAvailabilityRefetch?.();
    }
  }, [selectedClinicId, selectedTypeId, applyTransition, announce, onAvailabilityRefetch]);

  const confirm = useCallback(async () => {
    const currentHold = holdRef.current;
    if (!currentHold || !selected) return;
    if (isBusyState(attemptRef.current)) return;

    applyTransition({ type: 'COMMIT_REQUESTED' });
    setMessage('');
    announce('Confirming your appointment. Please wait.');

    const commitKey = currentHold.commitKey;
    idempotencyKeyRef.current = commitKey;

    try {
      const result = await commitHold(currentHold.id, commitKey, selected);
      setBooking(result);
      applyTransition({ type: 'COMMIT_SUCCEEDED' });
      setMessage('');
      announce(`Appointment confirmed. Your reference is ${result.reference}.`);
      await onAvailabilityRefetch?.();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'BOOKING_OUTCOME_UNKNOWN' || apiError.code === 'NETWORK_TIMEOUT') {
        applyTransition({ type: 'NETWORK_TIMEOUT' });
        setMessage(
          "We're checking whether the appointment was confirmed. Please do not submit this booking again.",
        );
        announce("We're checking your booking status. Please wait.");
        // Polling will begin automatically via the useEffect above
      } else if (
        apiError.code === 'SLOT_UNAVAILABLE' ||
        apiError.code === 'BOOKING_CONFLICT' ||
        apiError.bookingCreated === false
      ) {
        applyTransition({ type: 'SLOT_UNAVAILABLE' });
        setMessage(
          apiError.message ||
          'That appointment was booked by another patient just before your request was completed. No appointment was created for you.',
        );
        announce('Appointment unavailable. Showing alternative times.');
        setAlternatives(await getAlternatives(selectedClinicId, selectedTypeId).catch(() => []));
      } else if (apiError.code === 'HOLD_EXPIRED') {
        applyTransition({ type: 'HOLD_EXPIRED' });
        setMessage('Your reservation expired. Please choose another time.');
        announce('Reservation expired. Please choose a new time.');
      } else if (apiError.retryable) {
        applyTransition({ type: 'RETRYABLE_ERROR' });
        setMessage(messageFor(err));
      } else {
        applyTransition({ type: 'TERMINAL_ERROR' });
        setMessage(messageFor(err));
      }
    }
  }, [selected, selectedClinicId, selectedTypeId, applyTransition, announce, onAvailabilityRefetch]);

  const cancel = useCallback(async () => {
    if (!booking) return;
    applyTransition({ type: 'CANCEL_REQUESTED' });
    setMessage('');
    announce('Cancelling appointment. Please wait.');

    try {
      await cancelBooking(booking.bookingId, crypto.randomUUID());
      applyTransition({ type: 'CANCEL_SUCCEEDED' });
      announce('Appointment cancelled successfully.');
      await onAvailabilityRefetch?.();
    } catch (err) {
      setMessage(messageFor(err));
      applyTransition({ type: 'CANCEL_FAILED' });
      announce('Cancellation failed. Please try again.');
    }
  }, [booking, applyTransition, announce, onAvailabilityRefetch]);

  const reschedule = useCallback(async (bookingId: string, newSlotId: string) => {
    try {
      await rescheduleBooking(bookingId, newSlotId, crypto.randomUUID());
      announce('Appointment rescheduled successfully.');
      await onAvailabilityRefetch?.();
    } catch (err) {
      setMessage(messageFor(err));
    }
  }, [announce, onAvailabilityRefetch]);

  const busy = isBusyState(attempt);

  return {
    attempt,
    selected,
    hold,
    seconds,
    alternatives,
    booking,
    message,
    busy,
    resolving,
    announcement,
    choose,
    confirm,
    cancel,
    reschedule,
    reset,
  };
}
