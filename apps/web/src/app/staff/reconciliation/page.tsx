'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';
import { getReconciliationQueue, releaseSlot } from '@/lib/api/booking-client';
import { useState } from 'react';

function ReconciliationWorkspace() {
  const [releasingId, setReleasingId] = useState<string>();
  const [actionMessage, setActionMessage] = useState('');

  const reconciliationQuery = useQuery({
    queryKey: ['reconciliation'],
    queryFn: getReconciliationQueue,
    refetchInterval: 30_000,
  });

  const handleRelease = async (slotId: string, ref: string) => {
    setReleasingId(slotId);
    setActionMessage('');
    try {
      await releaseSlot(slotId);
      setActionMessage(`Slot for ${ref} has been safely republished to available inventory.`);
      await reconciliationQuery.refetch();
    } catch {
      setActionMessage(`Failed to release slot for ${ref}. Please try again.`);
    } finally {
      setReleasingId(undefined);
    }
  };

  const items = reconciliationQuery.data ?? [];

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

        {actionMessage && (
          <div role="status" style={{ background: '#e6f7ed', border: '1px solid #107c41', color: '#107c41', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 18, height: 18 }} aria-hidden="true" />
            {actionMessage}
          </div>
        )}

        {reconciliationQuery.isError && (
          <div className="staff-error" role="alert" style={{ marginBottom: '1.5rem' }}>
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>Reconciliation data unavailable</strong>
              <p>Check the booking service connection.</p>
            </div>
            <button className="button secondary" onClick={() => reconciliationQuery.refetch()}>Retry</button>
          </div>
        )}

        <section className="work-queue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p className="eyebrow">Controlled release queue</p>
              <h2 style={{ margin: 0 }}>{items.length} {items.length === 1 ? 'item needs' : 'items need'} review</h2>
            </div>
            <span className="badge degraded">
              <ShieldAlert aria-hidden="true" style={{ width: 14, height: 14 }} /> Staff action required
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th scope="col">Safe reference</th>
                <th scope="col">Category</th>
                <th scope="col">Age</th>
                <th scope="col">Next safe action</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'hsl(var(--muted))', padding: '2rem' }}>
                    <Activity style={{ margin: '0 auto 8px', display: 'block', color: 'hsl(var(--trust))' }} aria-hidden="true" />
                    No items in the reconciliation queue.
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td><strong style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{item.safeReference}</strong></td>
                  <td>{item.category}</td>
                  <td style={{ color: 'hsl(var(--muted))' }}>{item.ageMinutes} min</td>
                  <td>{item.nextSafeAction}</td>
                  <td>
                    <button
                      className="button secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      disabled={releasingId === item.slotId}
                      onClick={() => handleRelease(item.slotId, item.safeReference)}
                    >
                      {releasingId === item.slotId ? 'Releasing…' : 'Release to inventory'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

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
