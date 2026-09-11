'use client';

import React from 'react';
import type { SlotAvailabilityState } from '@/types/booking';

const config: Record<SlotAvailabilityState, { label: string; className: string }> = {
  PROVISIONAL:          { label: 'Available',   className: 'badge-provisional' },
  HELD_BY_THIS_SESSION: { label: 'Held by you', className: 'badge-held-own' },
  HELD_BY_OTHER:        { label: 'Held',        className: 'badge-held' },
  BOOKED:               { label: 'Booked',      className: 'badge-booked' },
  BLOCKED:              { label: 'Blocked',      className: 'badge-blocked' },
  EXPIRED:              { label: 'Expired',      className: 'badge-expired' },
  UNKNOWN:              { label: 'Unknown',      className: 'badge-unknown' },
  STALE:                { label: 'Stale data',   className: 'badge-stale' },
};

interface SlotStatusBadgeProps {
  state: SlotAvailabilityState;
}

export function SlotStatusBadge({ state }: SlotStatusBadgeProps) {
  const { label, className } = config[state] ?? config.UNKNOWN;
  return (
    <span className={`slot-status-badge ${className}`} aria-label={`Slot status: ${label}`}>
      {label}
    </span>
  );
}
