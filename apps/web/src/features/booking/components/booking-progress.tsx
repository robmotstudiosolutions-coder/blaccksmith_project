'use client';

import React from 'react';

interface BookingProgressProps {
  step: 'search' | 'hold' | 'confirm' | 'done';
}

const steps = [
  { id: 'search', label: 'Search' },
  { id: 'hold',   label: 'Reserve' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'done',   label: 'Done' },
] as const;

const stepIndex = (step: BookingProgressProps['step']) =>
  steps.findIndex(s => s.id === step);

export function BookingProgress({ step }: BookingProgressProps) {
  const current = stepIndex(step);

  return (
    <nav aria-label="Booking progress" className="booking-progress">
      <ol className="booking-progress__list">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.id}
              className={`booking-progress__step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="booking-progress__num" aria-hidden="true">
                {done ? '✓' : i + 1}
              </span>
              <span className="booking-progress__label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
