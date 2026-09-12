'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CalendarCheck, Clock3, FileText, ShieldCheck } from 'lucide-react';
import { AccessGate } from '@/components/access-gate';
import { AppHeader } from '@/components/app-header';
import { getAuditEvents, getStaffMetrics } from '@/lib/api/booking-client';
import { useSession } from '@/lib/session';
import { ReconciliationTable } from '@/features/staff/components/reconciliation-table';

function StaffOperations() {
  const { user } = useSession();

  const metricsQuery = useQuery({
    queryKey: ['staffMetrics'],
    queryFn: getStaffMetrics
  });

  const auditQuery = useQuery({
    queryKey: ['staffAudit'],
    queryFn: () => getAuditEvents(10)
  });

  const metrics = metricsQuery.data ?? [];
  const auditEvents = auditQuery.data ?? [];

  const roleLabel =
    user?.role === 'OPERATIONS_MANAGER'
      ? 'Operations management'
      : user?.role === 'CLINIC_ADMIN'
      ? 'Clinic administration'
      : user?.role === 'AUDITOR'
      ? 'Governance & Audit'
      : 'Booking staff';

  return (
    <main>
      <AppHeader staff/>

      <section className="staff-page">
        <p className="eyebrow">{roleLabel} · Main Hospital</p>
        <h1>Operations overview</h1>
        <p className="lead">
          Review inventory health and items requiring controlled follow-up. In compliance with data privacy policies, patient names and clinical details are strictly excluded from this view.
        </p>

        {metricsQuery.isError && <section className="staff-error" role="alert"><AlertTriangle/><div><strong>Operations data is unavailable.</strong><p>Check the booking service connection and try again.</p></div><button className="button secondary" onClick={() => metricsQuery.refetch()}>Retry</button></section>}
        <div className="metric-grid">
          {metricsQuery.isLoading && <p>Loading operations metrics…</p>}
          {metrics.map((item, index) => (
            <article className="metric" key={item.label}>
              {index === 1 ? <AlertTriangle/> : index === 0 ? <CalendarCheck/> : index === 2 ? <Clock3/> : <Activity/>}
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))}
        </div>

        {/* Shared Reconciliation Section */}
        <ReconciliationTable
          onMutated={async () => {
            await metricsQuery.refetch();
            await auditQuery.refetch();
          }}
        />

        {/* Audit Trail Section */}
        <section className="work-queue" id="audit">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p className="eyebrow">Operational audit trail</p>
              <h2>Recent immutable event log</h2>
            </div>
            <span className="badge">
              <ShieldCheck aria-hidden="true"/> Zero-PHI Verified
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target Type</th>
                <th>Outcome</th>
                <th>Correlation ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                    No audit records available.
                  </td>
                </tr>
              ) : (
                auditEvents.map(evt => (
                  <tr key={evt.id}>
                    <td>
                      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <FileText style={{ width: 14, height: 14, color: '#666' }} />
                        {evt.action}
                      </span>
                    </td>
                    <td>{evt.targetType}</td>
                    <td>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: evt.outcome === 'SUCCESS' ? '#e6f7ed' : '#fff3e0',
                        color: evt.outcome === 'SUCCESS' ? '#107c41' : '#b76e00'
                      }}>
                        {evt.outcome}
                      </span>
                    </td>
                    <td><code>{evt.correlationId}</code></td>
                    <td style={{ color: '#666', fontSize: '0.8125rem' }}>
                      {new Date(evt.occurredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

export default function StaffDashboard() { return <AccessGate requireStaff><StaffOperations/></AccessGate>; }
