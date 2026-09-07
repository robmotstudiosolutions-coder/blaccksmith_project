'use client';

import React from 'react';
import { TriangleAlert } from 'lucide-react';
import type { Slot } from '@/types/booking';
import { SlotCard } from './slot-card';

interface AlternativeSlotsProps {
  message: string;
  alternatives: Slot[];
  onSelectAlternative: (slot: Slot) => void;
}

export function AlternativeSlots({
  message,
  alternatives,
  onSelectAlternative
}: AlternativeSlotsProps) {
  return (
    <section className="conflict" role="alert">
      <TriangleAlert />
      <div>
        <p className="eyebrow">Selected time unavailable</p>
        <h2>No appointment was created for you.</h2>
        <p>{message}</p>
      </div>
      <div className="alternatives">
        <h3>Other live times you can choose</h3>
        {alternatives.map(slot => (
          <SlotCard
            key={slot.slotId}
            slot={slot}
            disabled={false}
            onSelect={onSelectAlternative}
          />
        ))}
      </div>
    </section>
  );
}
