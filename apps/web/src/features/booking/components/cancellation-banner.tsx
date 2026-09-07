'use client';

import React from 'react';
import { XCircle } from 'lucide-react';

interface CancellationBannerProps {
  onSearchAgain: () => void;
}

export function CancellationBanner({ onSearchAgain }: CancellationBannerProps) {
  return (
    <section className="confirmation" aria-live="polite" style={{ borderColor: '#888' }}>
      <XCircle style={{ color: '#666' }} />
      <div>
        <p className="eyebrow">Appointment cancelled</p>
        <h2>Your cancellation was processed</h2>
        <p>
          Your appointment has been safely cancelled. The reserved slot is scheduled for controlled
          release.
        </p>
        <button
          className="button secondary"
          style={{ marginTop: '1rem' }}
          onClick={onSearchAgain}
        >
          Book another appointment
        </button>
      </div>
    </section>
  );
}
