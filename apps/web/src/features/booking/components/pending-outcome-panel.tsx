'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PendingOutcomePanelProps {
  /** Reference used to poll the outcome – do not display to patient, only show to staff */
  correlationId?: string;
  isStaff?: boolean;
}

export function PendingOutcomePanel({ correlationId, isStaff }: PendingOutcomePanelProps) {
  return (
    <section className="status" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="animate-spin" aria-hidden="true" style={{ flexShrink: 0 }} />
      <div>
        <p className="eyebrow">Checking booking status</p>
        <h2>We&apos;re checking whether the appointment was confirmed.</h2>
        <p>
          Please do not submit this booking again. We will update this page automatically.
        </p>
        {isStaff && correlationId && (
          <p className="small" style={{ marginTop: '0.5rem', color: 'var(--color-muted)' }}>
            Tracking reference: <code>{correlationId}</code>
          </p>
        )}
      </div>
    </section>
  );
}
