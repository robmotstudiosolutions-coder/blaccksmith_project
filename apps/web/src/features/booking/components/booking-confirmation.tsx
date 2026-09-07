'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Booking } from '@/types/booking';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

interface BookingConfirmationProps {
  booking: Booking;
  errorMessage?: string;
  onCancel: () => void;
}

export function BookingConfirmation({
  booking,
  errorMessage,
  onCancel
}: BookingConfirmationProps) {
  const [confirmCancelPrompt, setConfirmCancelPrompt] = useState(false);

  return (
    <section className="confirmation" aria-live="polite">
      <CheckCircle2 />
      <div style={{ width: '100%' }}>
        <p className="eyebrow">Appointment confirmed</p>
        <h2>Your booking is complete</h2>
        <p>
          Reference: <strong>{booking.reference}</strong> · {formatTime(booking.slot.startsAt)} with{' '}
          {booking.slot.clinicianName} at {booking.slot.clinicName}.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', flexWrap: 'wrap' }}>
          <a
            href="/account"
            className="button"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            Manage in Patient Portal
          </a>
          {booking.slot.mode === 'VIDEO' && (
            <a
              href={`/appointments/${booking.bookingId}/telehealth`}
              className="button secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Enter Telehealth Consultation
            </a>
          )}
        </div>

        {errorMessage && <p style={{ color: 'red', marginTop: '0.5rem' }}>{errorMessage}</p>}

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
          {!confirmCancelPrompt ? (
            <button
              className="button secondary"
              style={{ color: '#c00', borderColor: '#c00' }}
              onClick={() => setConfirmCancelPrompt(true)}
            >
              Cancel this appointment
            </button>
          ) : (
            <div style={{ background: '#fff5f5', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600 }}>
                Are you sure you want to cancel this booking?
              </p>
              <button
                className="button"
                style={{ background: '#c00', color: '#fff', marginRight: '0.75rem' }}
                onClick={() => {
                  setConfirmCancelPrompt(false);
                  onCancel();
                }}
              >
                Yes, cancel appointment
              </button>
              <button
                className="button secondary"
                onClick={() => setConfirmCancelPrompt(false)}
              >
                Keep appointment
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
