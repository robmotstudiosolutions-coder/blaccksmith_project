'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { getReconciliationQueue, releaseSlot } from '@/lib/api/booking-client';
import { useSession } from '@/lib/session';
import { can } from '@/lib/permissions';

export interface ReconciliationTableProps {
  onMutated?: () => Promise<unknown> | void;
  title?: string;
  subtitle?: string;
}

export function ReconciliationTable({
  onMutated,
  title = 'Controlled release & reconciliation queue',
  subtitle,
}: ReconciliationTableProps) {
  const { user } = useSession();
  const [releasingId, setReleasingId] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>('');

  const reconciliationQuery = useQuery({
    queryKey: ['staffReconciliation'],
    queryFn: getReconciliationQueue,
    refetchInterval: 30_000,
  });

  const canRelease = can(user?.role, 'capacity:release');

  const handleRelease = async (slotId: string, ref: string) => {
    if (!canRelease) return;
    setReleasingId(slotId);
    setActionMessage('');
    try {
      await releaseSlot(slotId);
      setActionMessage(`Slot for ${ref} was safely republished to available inventory.`);
      await reconciliationQuery.refetch();
      if (onMutated) await onMutated();
    } catch {
      setActionMessage(`Failed to release slot for ${ref}. Please try again.`);
    } finally {
      setReleasingId(undefined);
    }
  };

  const items = reconciliationQuery.data ?? [];

  return (
    <section className="work-queue" id="reconciliation" style={{ marginBottom: '2.5rem' }}>
      {actionMessage && (
        <div
          role="status"
          style={{
            background: '#e6f7ed',
            border: '1px solid #107c41',
            color: '#107c41',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 style={{ width: 18, height: 18 }} aria-hidden="true" />
          <span>{actionMessage}</span>
        </div>
      )}

      {reconciliationQuery.isError && (
        <div className="staff-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Reconciliation data unavailable</strong>
            <p>Check the booking service connection and try again.</p>
          </div>
          <button className="button secondary" onClick={() => reconciliationQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{items.length} {items.length === 1 ? 'item needs' : 'items need'} review</h2>
          {subtitle && <p style={{ color: 'hsl(var(--muted))', margin: 0, fontSize: '0.88rem' }}>{subtitle}</p>}
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
              <td colSpan={5} style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                <Activity style={{ margin: '0 auto 8px', display: 'block', color: 'hsl(var(--trust))' }} aria-hidden="true" />
                No items currently in the reconciliation queue.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{item.safeReference}</strong>
                </td>
                <td>{item.category}</td>
                <td style={{ color: '#666' }}>{item.ageMinutes} min</td>
                <td>{item.nextSafeAction}</td>
                <td>
                  {canRelease ? (
                    <button
                      className="button secondary"
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                      disabled={releasingId === item.slotId}
                      onClick={() => handleRelease(item.slotId, item.safeReference)}
                    >
                      {releasingId === item.slotId ? 'Releasing…' : 'Release to inventory'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>View only (no release permission)</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
