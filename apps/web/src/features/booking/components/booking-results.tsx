'use client';

import React from 'react';
import { Clock3, TriangleAlert } from 'lucide-react';
import type { Booking, BookingAttemptState, Slot } from '@/types/booking';
import type { Specialty } from '@/lib/specialties';
import type { SessionUser } from '@/lib/session';
import { StatusBanner } from '@/components/ui/status-banner';
import { SlotCard } from './slot-card';
import { HoldBanner } from './hold-banner';
import { BookingConfirmation } from './booking-confirmation';
import { CancellationBanner } from './cancellation-banner';
import { AlternativeSlots } from './alternative-slots';

interface BookingResultsProps {
  user?: SessionUser;
  selectedSpecialty?: Specialty;
  isOnlineBookable: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  slots?: Slot[];
  attempt: BookingAttemptState;
  selectedSlot?: Slot;
  hold?: { id: string; expiresAt: string };
  secondsRemaining: number;
  booking?: Booking;
  actionMessage?: string;
  alternatives: Slot[];
  busy: boolean;
  onSelectSlot: (slot: Slot) => void;
  onConfirmHold: () => void;
  onCancelBooking: () => void;
  onResetSearch: () => void;
  onRefetchAvailability: () => void;
}

export function BookingResults({
  user,
  selectedSpecialty,
  isOnlineBookable,
  isLoading,
  isError,
  errorMessage,
  slots,
  attempt,
  selectedSlot,
  hold,
  secondsRemaining,
  booking,
  actionMessage,
  alternatives,
  busy,
  onSelectSlot,
  onConfirmHold,
  onCancelBooking,
  onResetSearch,
  onRefetchAvailability
}: BookingResultsProps) {
  return (
    <section className="results" aria-live="polite">
      <div className="section-title">
        <div>
          <p className="eyebrow">Available appointments</p>
          <h2>Select a provisional time</h2>
        </div>
        <span className="badge">Live availability</span>
      </div>

      <p className="notice">
        <Clock3 aria-hidden="true" /> A displayed time can change before you complete your booking.
        {!user && ' Sign in is required before reserving a time.'}
      </p>

      {!isOnlineBookable && (
        <section className="service-notice">
          <Clock3 aria-hidden="true" />
          <div>
            <h3>{selectedSpecialty?.name ?? 'This service'} is being added</h3>
            <p>
              Online appointment scheduling for this specialty is not available yet. Choose an
              available specialty or contact the clinic for assistance.
            </p>
          </div>
        </section>
      )}

      {isOnlineBookable && isLoading && <p>Checking availability…</p>}

      {isError && (
        <section className="expired" role="alert">
          <TriangleAlert />
          <div>
            <h2>Booking service unavailable</h2>
            <p>{errorMessage ?? 'We could not complete that request. Please try again.'}</p>
            <button className="button secondary" onClick={onRefetchAvailability}>
              Try again
            </button>
          </div>
        </section>
      )}

      {!isLoading && !isError && slots?.length === 0 && (
        <p>
          No appointments are currently available for this specialty. Try another clinic or check
          back later.
        </p>
      )}

      {slots?.map(slot => (
        <SlotCard
          key={slot.slotId}
          slot={slot}
          disabled={busy || attempt === 'HELD'}
          onSelect={onSelectSlot}
        />
      ))}

      {attempt === 'HOLDING' && (
        <StatusBanner
          title="Reserving your selected time"
          text="We are checking the latest availability."
        />
      )}

      {attempt === 'HELD' && selectedSlot && hold && (
        <HoldBanner
          selected={selectedSlot}
          expiresAt={hold.expiresAt}
          secondsRemaining={secondsRemaining}
          onConfirm={onConfirmHold}
        />
      )}

      {attempt === 'COMMITTING' && (
        <StatusBanner
          title="Confirming your appointment"
          text="Completing the booking securely. Please do not close this page."
        />
      )}

      {attempt === 'CONFIRMED' && booking && (
        <BookingConfirmation
          booking={booking}
          errorMessage={actionMessage}
          onCancel={onCancelBooking}
        />
      )}

      {attempt === 'CANCELLING' && (
        <StatusBanner
          title="Processing cancellation"
          text="Cancelling your appointment and updating hospital records. Please wait."
        />
      )}

      {attempt === 'CANCELLED' && <CancellationBanner onSearchAgain={onResetSearch} />}

      {attempt === 'RACE_LOST' && (
        <AlternativeSlots
          message={actionMessage ?? 'That appointment is no longer available.'}
          alternatives={alternatives}
          onSelectAlternative={onSelectSlot}
        />
      )}

      {attempt === 'EXPIRED' && (
        <section className="expired" role="alert">
          <TriangleAlert />
          <div>
            <h2>Reservation expired</h2>
            <p>{actionMessage}</p>
            <button className="button secondary" onClick={onResetSearch}>
              Check availability again
            </button>
          </div>
        </section>
      )}

      {(attempt === 'FAILED_RETRYABLE' || attempt === 'FAILED_TERMINAL') && (
        <section className="expired" role="alert">
          <TriangleAlert />
          <div>
            <h2>We could not complete that action</h2>
            <p>{actionMessage}</p>
            <button
              className="button secondary"
              onClick={attempt === 'FAILED_RETRYABLE' ? onConfirmHold : onResetSearch}
            >
              {attempt === 'FAILED_RETRYABLE' ? 'Retry confirmation' : 'Check availability again'}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
