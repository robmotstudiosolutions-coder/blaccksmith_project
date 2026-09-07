'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SessionUser } from '@/lib/session';
import type { ApiError, Booking, BookingAttemptState, Slot } from '@/types/booking';
import {
  cancelBooking,
  commitHold,
  createHold,
  getAlternatives
} from '@/lib/api/booking-client';

const messageFor = (error: unknown) =>
  (error as ApiError).message ?? 'We could not complete that request. Please try again.';

export function useBookingFlow(
  user: SessionUser | undefined,
  selectedClinicId: string,
  selectedTypeId: string,
  onAvailabilityRefetch: () => Promise<unknown>
) {
  const [attempt, setAttempt] = useState<BookingAttemptState>('IDLE');
  const [selected, setSelected] = useState<Slot>();
  const [hold, setHold] = useState<{ id: string; expiresAt: string; commitKey: string }>();
  const [seconds, setSeconds] = useState(0);
  const [alternatives, setAlternatives] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Booking>();
  const [message, setMessage] = useState('');

  // Hold countdown timer
  useEffect(() => {
    if (!hold || attempt !== 'HELD') return;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1_000)
      );
      setSeconds(remaining);
      if (remaining === 0) {
        setAttempt('EXPIRED');
        setMessage(
          'Your temporary reservation expired. Check live availability and choose another time.'
        );
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, [hold, attempt]);

  const reset = useCallback(async () => {
    setMessage('');
    setAttempt('IDLE');
    setSelected(undefined);
    setHold(undefined);
    setAlternatives([]);
    await onAvailabilityRefetch();
  }, [onAvailabilityRefetch]);

  const choose = useCallback(
    async (slot: Slot) => {
      if (!user) {
        window.location.assign('/sign-in');
        return;
      }
      setSelected(slot);
      setMessage('');
      setAttempt('HOLDING');
      try {
        const result = await createHold(slot.slotId, crypto.randomUUID());
        setHold({
          id: result.holdId,
          expiresAt: result.expiresAt,
          commitKey: crypto.randomUUID()
        });
        setAttempt('HELD');
        await onAvailabilityRefetch();
      } catch (error) {
        setMessage(messageFor(error));
        setAttempt('FAILED_TERMINAL');
        await onAvailabilityRefetch();
      }
    },
    [user, onAvailabilityRefetch]
  );

  const confirm = useCallback(async () => {
    if (!hold || !selected) return;
    setAttempt('COMMITTING');
    setMessage('');
    try {
      setBooking(await commitHold(hold.id, hold.commitKey, selected));
      setAttempt('CONFIRMED');
      await onAvailabilityRefetch();
    } catch (error) {
      const apiError = error as ApiError;
      setMessage(messageFor(error));
      if (
        apiError.code === 'BOOKING_CONFLICT' ||
        apiError.code === 'SLOT_NOT_AVAILABLE' ||
        apiError.code === 'HOLD_EXPIRED'
      ) {
        setAlternatives(
          await getAlternatives(selectedClinicId, selectedTypeId).catch(() => [])
        );
        setAttempt(apiError.code === 'HOLD_EXPIRED' ? 'EXPIRED' : 'RACE_LOST');
      } else {
        setAttempt(apiError.retryable ? 'FAILED_RETRYABLE' : 'FAILED_TERMINAL');
      }
    }
  }, [hold, selected, selectedClinicId, selectedTypeId, onAvailabilityRefetch]);

  const cancel = useCallback(async () => {
    if (!booking) return;
    setAttempt('CANCELLING');
    setMessage('');
    try {
      await cancelBooking(booking.bookingId, crypto.randomUUID());
      setAttempt('CANCELLED');
      await onAvailabilityRefetch();
    } catch (error) {
      setMessage(messageFor(error));
      setAttempt('CONFIRMED'); // revert to confirmed so patient can retry cancellation
    }
  }, [booking, onAvailabilityRefetch]);

  const busy = attempt === 'HOLDING' || attempt === 'COMMITTING' || attempt === 'CANCELLING';

  return {
    attempt,
    selected,
    hold,
    seconds,
    alternatives,
    booking,
    message,
    busy,
    choose,
    confirm,
    cancel,
    reset
  };
}
