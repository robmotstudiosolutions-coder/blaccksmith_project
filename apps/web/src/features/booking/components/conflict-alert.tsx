'use client';

import React from 'react';
import { TriangleAlert } from 'lucide-react';
import type { Slot } from '@/types/booking';

interface ConflictAlertProps {
  message?: string;
  /** Safe correlation ID for staff context. Only show if actor is staff. */
  correlationId?: string;
  isStaff?: boolean;
}

export function ConflictAlert({ message, correlationId, isStaff }: ConflictAlertProps) {
  const displayMessage =
    message ??
    'That appointment was booked by another patient just before your request was completed. No appointment was created for you.';

  return (
    <section className="conflict" role="alert" aria-live="assertive">
      <TriangleAlert aria-hidden="true" />
      <div>
        <p className="eyebrow">Appointment unavailable</p>
        <h2>No appointment was created for you.</h2>
        <p>{displayMessage}</p>
        {isStaff && correlationId && (
          <p className="small" style={{ marginTop: '0.5rem', color: 'var(--color-muted)' }}>
            Reference: <code>{correlationId}</code>
          </p>
        )}
      </div>
    </section>
  );
}

interface AlternativeSlotListProps {
  alternatives: Slot[];
  isStaff?: boolean;
  correlationId?: string;
  onSelect: (slot: Slot) => void;
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));

export function AlternativeSlotList({ alternatives, isStaff, correlationId, onSelect }: AlternativeSlotListProps) {
  return (
    <>
      <ConflictAlert isStaff={isStaff} correlationId={correlationId} />
      <div className="alternatives">
        <h3>Other available times</h3>
        {alternatives.length === 0 ? (
          <p>No alternative times are currently available. Please contact the clinic.</p>
        ) : (
          alternatives.map((slot) => {
            const similarity = (slot as Slot & { similarity?: string }).similarity;
            return (
              <article className="slot-card" key={slot.slotId}>
                <div>
                  <p className="eyebrow">{slot.clinicName}</p>
                  {similarity && (
                    <span className="badge" style={{ marginBottom: '6px', display: 'inline-flex' }}>
                      {similarity}
                    </span>
                  )}
                  <h3>{formatTime(slot.startsAt)}</h3>
                  <p>{slot.clinicianName} · {slot.mode === 'IN_PERSON' ? 'In person' : 'Video visit'}</p>
                </div>
                <button className="button secondary" onClick={() => onSelect(slot)}>
                  Choose this time
                </button>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
