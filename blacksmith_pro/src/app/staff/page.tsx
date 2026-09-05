'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CalendarCheck, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import { getReconciliationQueue, getStaffMetrics, releaseSlot } from '@/lib/api/booking-client';

export default function StaffDashboard() {
  const [releasingId, setReleasingId] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>('');

  const metricsQuery = useQuery({
    queryKey: ['staffMetrics'],
    queryFn: getStaffMetrics
  });

  const reconciliationQuery = useQuery({
    queryKey: ['staffReconciliation'],
    queryFn: getReconciliationQueue
  });

  const handleRelease = async (slotId: string, ref: string) => {
    setReleasingId(slotId);
    setActionMessage('');
    try {
      await releaseSlot(slotId);
      setActionMessage(`Slot for ${ref} was safely republished to available inventory.`);
      await reconciliationQuery.refetch();
      await metricsQuery.refetch();
    } catch {
      setActionMessage(`Failed to release slot for ${ref}. Please try again.`);
    } finally {
      setReleasingId(undefined);
    }
  };

  const metrics = metricsQuery.data ?? [
    { label: 'Today’s confirmed bookings', value: '42', note: 'Across three clinics' },
    { label: 'Unresolved outcomes', value: '2', note: 'Awaiting controlled release' },
    { label: 'Hold expiries', value: '7', note: 'Today' },
    { label: 'Availability conflicts', value: '3.1%', note: 'Last 24 hours' }
  ];

  const items = reconciliationQuery.data ?? [];

  return (
    <main>
      <header className="header">
        <a className="brand" href="/">SlotSure</a>
        <nav aria-label="Staff">
          <a href="/staff">Operations</a>
          <a href="/">Patient booking view</a>
        </nav>
      </header>

      <section className="staff-page">
        <p className="eyebrow">Booking staff · Main Hospital</p>
        <h1>Operations overview</h1>
        <p className="lead">
          Review inventory health and items requiring controlled follow-up. In compliance with data privacy policies, patient names and clinical details are strictly excluded from this view.
        </p>

        {actionMessage && (
          <div style={{ background: '#e6f7ed', border: '1px solid #107c41', color: '#107c41', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 style={{ width: 18, height: 18 }} />
            <span>{actionMessage}</span>
          </div>
        )}

        <div className="metric-grid">
          {metrics.map((item, index) => (
            <article className="metric" key={item.label}>
              {index === 1 ? <AlertTriangle/> : index === 0 ? <CalendarCheck/> : index === 2 ? <Clock3/> : <Activity/>}
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))}
        </div>

        <section className="work-queue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p className="eyebrow">Controlled release & reconciliation queue</p>
              <h2>{items.length} {items.length === 1 ? 'item needs' : 'items need'} review</h2>
            </div>
            <span className="badge degraded">
              <ShieldAlert aria-hidden="true"/> Staff action required
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Safe reference</th>
                <th>Category</th>
                <th>Age</th>
                <th>Next safe action</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                    No items currently in the reconciliation queue.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.safeReference}</strong></td>
                    <td>{item.category}</td>
                    <td>{item.ageMinutes} min</td>
                    <td>{item.nextSafeAction}</td>
                    <td>
                      <button
                        className="button secondary"
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                        disabled={releasingId === item.slotId}
                        onClick={() => handleRelease(item.slotId, item.safeReference)}
                      >
                        {releasingId === item.slotId ? 'Releasing…' : 'Release to inventory'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
