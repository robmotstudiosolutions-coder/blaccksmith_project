'use client';

import React from 'react';
import { Clock3 } from 'lucide-react';
import type { Slot } from '@/types/booking';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

interface HoldBannerProps {
  selected: Slot;
  expiresAt: string;
  secondsRemaining: number;
  onConfirm: () => void;
}

export function HoldBanner({
  selected,
  expiresAt,
  secondsRemaining,
  onConfirm
}: HoldBannerProps) {
  return (
    <section className="hold-card" aria-live="polite">
      <Clock3 />
      <div>
        <p className="eyebrow">Temporary reservation</p>
        <h2>This time is held for you</h2>
        <p>
          {formatTime(selected.startsAt)} with {selected.clinicianName}. Complete your
          booking before {formatTime(expiresAt)}.
        </p>
        <p className="countdown">About {secondsRemaining} seconds remaining</p>
      </div>
      <button
        className="button"
        disabled={secondsRemaining === 0}
        onClick={onConfirm}
      >
        Confirm appointment
      </button>
    </section>
  );
}
