'use client';

import React from 'react';
import type { Slot } from '@/types/booking';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

interface SlotCardProps {
  slot: Slot;
  onSelect: (slot: Slot) => void;
  disabled: boolean;
}

export function SlotCard({ slot, onSelect, disabled }: SlotCardProps) {
  return (
    <article className="slot-card">
      <div>
        <p className="eyebrow">{slot.clinicName}</p>
        <h3>{formatTime(slot.startsAt)}</h3>
        <p>
          {slot.clinicianName} · {slot.mode === 'IN_PERSON' ? 'In person' : 'Video visit'}
        </p>
      </div>
      <button
        className="button secondary"
        disabled={disabled}
        onClick={() => onSelect(slot)}
      >
        Choose this time
      </button>
    </article>
  );
}
