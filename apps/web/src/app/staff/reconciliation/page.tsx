'use client';

import React from 'react';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';
import { ReconciliationTable } from '@/features/staff/components/reconciliation-table';

function ReconciliationWorkspace() {
  return (
    <main>
      <AppHeader staff />
      <section className="staff-page">
        <p className="eyebrow">Staff operations · EHR reconciliation</p>
        <h1>Reconciliation queue</h1>
        <p style={{ color: 'hsl(var(--muted))', maxWidth: 680, marginBottom: '2rem' }}>
          Review items requiring controlled follow-up. Slot releases are recorded in the
          audit trail. Patient identifiers are not shown in this view.
        </p>

        <ReconciliationTable
          title="Controlled release queue"
          subtitle="Review and republish slots that were canceled or delayed during external updates."
        />

        <div style={{ marginTop: '1.5rem' }}>
          <a href="/staff" className="button secondary">← Back to operations</a>
        </div>
      </section>
    </main>
  );
}

export default function StaffReconciliationPage() {
  return (
    <AccessGate requireStaff>
      <ReconciliationWorkspace />
    </AccessGate>
  );
}

