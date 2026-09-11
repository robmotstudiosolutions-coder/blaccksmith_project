'use client';

/**
 * Clinician UI Components
 *
 * HIPAA minimum-necessary data display:
 * - Patient identity in all views is limited to safe references and initials only.
 * - Clinical documentation (notes, diagnoses, medications) remains in the EHR.
 * - This workspace facilitates schedule management and encounter start only.
 */

import React, { useState } from 'react';
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock, Loader2,
  Monitor, MonitorOff, PlayCircle, RefreshCw, ShieldCheck, Users, Video,
  VideoOff, Wifi, WifiOff, Building2
} from 'lucide-react';
import type {
  ClinicianAvailabilityStatus,
  ClinicianMetrics,
  ClinicianProfile,
  QueueEntry,
  ReadinessLevel,
  RoomReadiness,
  ScheduleItem,
} from '@/features/clinician/data';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

const formatRelativeMinutes = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

// ── Availability status badge ─────────────────────────────────────────────────

const statusConfig: Record<ClinicianAvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE:    { label: 'Available',    color: '#17653d' },
  IN_ENCOUNTER: { label: 'In encounter', color: '#b76e00' },
  CATCH_UP:     { label: 'Catch-up',     color: '#b76e00' },
  BREAK:        { label: 'Break',        color: '#666' },
  OFF_DUTY:     { label: 'Off duty',     color: '#666' },
};

interface ClinicianStatusBadgeProps {
  status: ClinicianAvailabilityStatus;
  onChangeStatus?: (next: ClinicianAvailabilityStatus) => void;
}

export function ClinicianStatusBadge({ status, onChangeStatus }: ClinicianStatusBadgeProps) {
  const { label, color } = statusConfig[status] ?? statusConfig.OFF_DUTY;
  const [open, setOpen] = useState(false);

  if (!onChangeStatus) {
    return (
      <span style={{ padding: '4px 10px', borderRadius: 999, background: '#f0f5f5', color, fontWeight: 700, fontSize: '0.8rem' }}>
        ● {label}
      </span>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="button secondary"
        style={{ padding: '4px 12px', fontSize: '0.8rem', gap: 6, display: 'inline-flex', alignItems: 'center' }}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Availability status: ${label}. Click to change.`}
      >
        <span style={{ color }}>●</span> {label}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Select availability status"
          style={{
            position: 'absolute', top: '110%', right: 0, minWidth: 160, zIndex: 10,
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
            boxShadow: '0 8px 24px #00000015', padding: '4px 0', margin: 0, listStyle: 'none',
          }}
        >
          {(Object.keys(statusConfig) as ClinicianAvailabilityStatus[]).map(s => (
            <li
              key={s}
              role="option"
              aria-selected={s === status}
              style={{ padding: '8px 16px', cursor: 'pointer', color: statusConfig[s].color, fontWeight: 600, fontSize: '0.85rem' }}
              onClick={() => { onChangeStatus(s); setOpen(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onChangeStatus(s); setOpen(false); } }}
              tabIndex={0}
            >
              ● {statusConfig[s].label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Workspace header ──────────────────────────────────────────────────────────

interface ClinicianWorkspaceHeaderProps {
  profile: ClinicianProfile;
  onChangeStatus?: (status: ClinicianAvailabilityStatus) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefreshed?: string;
}

export function ClinicianWorkspaceHeader({
  profile, onChangeStatus, onRefresh, refreshing, lastRefreshed,
}: ClinicianWorkspaceHeaderProps) {
  return (
    <div className="clinician-header">
      <div className="clinician-header__identity">
        <p className="eyebrow">Clinician workspace · {profile.clinicName}</p>
        <h1 style={{ margin: '4px 0 6px', fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
          {profile.displayName}
        </h1>
        <p style={{ color: 'hsl(var(--muted))', margin: 0, fontSize: '0.9rem' }}>
          {profile.title} · {profile.specialty}
        </p>
      </div>

      <div className="clinician-header__actions">
        <ClinicianStatusBadge status={profile.availabilityStatus} onChangeStatus={onChangeStatus} />

        <button
          className="button secondary"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh schedule and queue"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} aria-hidden="true" />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>

        {lastRefreshed && (
          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.78rem', margin: 0 }}>
            Updated {new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(lastRefreshed))}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Metrics bar ───────────────────────────────────────────────────────────────

interface MetricsBarProps {
  metrics: ClinicianMetrics;
}

export function ClinicianMetricsBar({ metrics }: MetricsBarProps) {
  const items = [
    { icon: <CalendarDays aria-hidden="true" />, label: 'Appointments today', value: metrics.appointmentsToday },
    { icon: <Users aria-hidden="true" />,         label: 'Patients waiting',   value: metrics.patientsWaiting, highlight: metrics.patientsWaiting > 0 },
    { icon: <Monitor aria-hidden="true" />,        label: 'Rooms ready',        value: metrics.roomsReady },
    { icon: <Activity aria-hidden="true" />,       label: 'Remaining visits',   value: metrics.remainingVisits },
  ];

  return (
    <div className="metric-grid" style={{ marginBottom: '2rem' }}>
      {items.map(item => (
        <article className="metric" key={item.label}>
          <span style={{ color: item.highlight ? 'hsl(var(--held))' : 'hsl(var(--trust))' }}>{item.icon}</span>
          <p>{item.label}</p>
          <strong style={{ color: item.highlight ? 'hsl(var(--held))' : undefined }}>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

// ── Appointment status badge ──────────────────────────────────────────────────

const apptStatusLabel: Record<ScheduleItem['status'], { label: string; color: string }> = {
  SCHEDULED:   { label: 'Scheduled',   color: 'hsl(var(--trust))' },
  CHECKED_IN:  { label: 'Checked in',  color: '#17653d' },
  READY:       { label: 'Ready',       color: '#17653d' },
  IN_PROGRESS: { label: 'In progress', color: 'hsl(var(--held))' },
  COMPLETED:   { label: 'Completed',   color: 'hsl(var(--muted))' },
  NO_SHOW:     { label: 'No show',     color: 'hsl(var(--conflict))' },
  CANCELLED:   { label: 'Cancelled',   color: 'hsl(var(--muted))' },
};

// ── Schedule table ─────────────────────────────────────────────────────────────

interface ScheduleTableProps {
  items: ScheduleItem[];
  onStartEncounter?: (item: ScheduleItem) => void;
  startingEncounterId?: string;
}

export function ScheduleTable({ items, onStartEncounter, startingEncounterId }: ScheduleTableProps) {
  if (items.length === 0) {
    return (
      <div className="auth-notice" style={{ marginTop: '1.5rem' }}>
        <CalendarDays aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
        <div>
          <h2 style={{ fontSize: '1.1rem' }}>No appointments scheduled today</h2>
          <p>Your schedule will appear here once appointments are booked for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="work-queue" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Patient ref.</th>
            <th scope="col">Appointment type</th>
            <th scope="col">Mode</th>
            <th scope="col">Status</th>
            <th scope="col">Waiting</th>
            <th scope="col">Next action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const { label: statusLabel, color: statusColor } = apptStatusLabel[item.status] ?? apptStatusLabel.SCHEDULED;
            const isStarting = startingEncounterId === item.scheduleItemId;

            return (
              <tr key={item.scheduleItemId}>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {formatTime(item.startsAt)}–{formatTime(item.endsAt)}
                </td>
                <td>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem' }}>
                    {item.safePatientReference}
                  </span>
                  {' '}
                  <span style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>({item.patientInitials})</span>
                </td>
                <td>{item.appointmentType}</td>
                <td>
                  {item.mode === 'VIDEO'
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Video style={{ width: 14, height: 14 }} aria-hidden="true" /> Video</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 style={{ width: 14, height: 14 }} aria-hidden="true" /> In clinic</span>}
                </td>
                <td>
                  <span style={{ color: statusColor, fontWeight: 700, fontSize: '0.82rem' }}>
                    {statusLabel}
                  </span>
                </td>
                <td style={{ color: 'hsl(var(--muted))', fontSize: '0.85rem' }}>
                  {item.waitingMinutes != null ? formatRelativeMinutes(item.waitingMinutes) : '—'}
                </td>
                <td>
                  {(item.nextAction === 'START_ENCOUNTER' || item.nextAction === 'JOIN_VIDEO') && onStartEncounter ? (
                    <button
                      className="button"
                      style={{ padding: '5px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      disabled={isStarting}
                      onClick={() => onStartEncounter(item)}
                    >
                      {isStarting
                        ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" aria-hidden="true" /> Starting…</>
                        : item.mode === 'VIDEO'
                          ? <><Video style={{ width: 12, height: 12 }} aria-hidden="true" /> Join video</>
                          : <><PlayCircle style={{ width: 12, height: 12 }} aria-hidden="true" /> Start encounter</>}
                    </button>
                  ) : item.nextAction === 'COMPLETE_ENCOUNTER' ? (
                    <span style={{ color: 'hsl(var(--held))', fontSize: '0.82rem', fontWeight: 600 }}>
                      In progress
                    </span>
                  ) : item.nextAction === 'VIEW_COMPLETED' ? (
                    item.encounterId
                      ? <a href={`/clinician/encounters/${item.encounterId}`} className="button secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>View record</a>
                      : <span style={{ color: 'hsl(var(--muted))', fontSize: '0.82rem' }}>Completed</span>
                  ) : (
                    <span style={{ color: 'hsl(var(--muted))', fontSize: '0.82rem' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Patient queue ─────────────────────────────────────────────────────────────

interface QueuePanelProps {
  entries: QueueEntry[];
  onStartEncounter?: (entry: QueueEntry) => void;
  startingEntryId?: string;
}

export function PatientQueuePanel({ entries, onStartEncounter, startingEntryId }: QueuePanelProps) {
  if (entries.length === 0) {
    return (
      <div className="auth-notice" style={{ marginTop: '1.5rem' }}>
        <Users aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
        <div>
          <h2 style={{ fontSize: '1.1rem' }}>No patients waiting</h2>
          <p>Patients who check in will appear here in order of arrival.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
      {entries.map((entry, i) => (
        <article
          key={entry.queueId}
          className="slot-card"
          style={{ borderLeft: `4px solid ${entry.status === 'READY' ? 'hsl(var(--available))' : 'hsl(var(--trust))'}` }}
        >
          <div>
            <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ background: 'hsl(var(--trust))', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                {i + 1}
              </span>
              {entry.status === 'READY' ? 'Ready' : 'Checked in'}
            </p>
            <h3 style={{ margin: '4px 0 2px', fontSize: '1rem' }}>
              {entry.safePatientReference}
              <span style={{ color: 'hsl(var(--muted))', fontWeight: 400, fontSize: '0.85rem', marginLeft: '0.5rem' }}>({entry.patientInitials})</span>
            </h3>
            <p style={{ color: 'hsl(var(--muted))', margin: 0, fontSize: '0.88rem' }}>
              {entry.appointmentType} ·{' '}
              {entry.mode === 'VIDEO'
                ? <><Video style={{ width: 12, height: 12, display: 'inline', marginRight: 2 }} aria-hidden="true" />Video</>
                : <><Building2 style={{ width: 12, height: 12, display: 'inline', marginRight: 2 }} aria-hidden="true" />In clinic</>}
            </p>
            <p style={{ color: 'hsl(var(--held))', fontSize: '0.82rem', fontWeight: 600, margin: '4px 0 0' }}>
              <Clock style={{ width: 12, height: 12, display: 'inline', marginRight: 2 }} aria-hidden="true" />
              Waiting {formatRelativeMinutes(entry.waitingMinutes)}
            </p>
          </div>

          {onStartEncounter && (
            <button
              className="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
              disabled={startingEntryId === entry.queueId}
              onClick={() => onStartEncounter(entry)}
              aria-label={`Start encounter for patient ${entry.safePatientReference}`}
            >
              {startingEntryId === entry.queueId
                ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden="true" /> Starting…</>
                : entry.mode === 'VIDEO'
                  ? <><Video style={{ width: 14, height: 14 }} aria-hidden="true" /> Join video</>
                  : <><PlayCircle style={{ width: 14, height: 14 }} aria-hidden="true" /> Open patient queue</>}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

// ── Room readiness panel ──────────────────────────────────────────────────────

const readinessIcon = (level: ReadinessLevel) => {
  switch (level) {
    case 'READY':     return <CheckCircle2 style={{ color: '#17653d', width: 16, height: 16 }} aria-hidden="true" />;
    case 'DEGRADED':  return <AlertTriangle style={{ color: 'hsl(var(--held))', width: 16, height: 16 }} aria-hidden="true" />;
    case 'NOT_READY': return <MonitorOff style={{ color: 'hsl(var(--conflict))', width: 16, height: 16 }} aria-hidden="true" />;
    default:          return <Clock style={{ color: 'hsl(var(--muted))', width: 16, height: 16 }} aria-hidden="true" />;
  }
};

const readinessLabel = (level: ReadinessLevel): string => {
  switch (level) {
    case 'READY':     return 'Ready';
    case 'DEGRADED':  return 'Degraded';
    case 'NOT_READY': return 'Not ready';
    default:          return 'Unknown';
  }
};

interface RoomReadinessPanelProps {
  readiness: RoomReadiness;
}

export function RoomReadinessPanel({ readiness }: RoomReadinessPanelProps) {
  const items = [
    { label: 'Video service', level: readiness.videoServiceStatus, Icon: Video },
    { label: 'Clinician device', level: readiness.clinicianDeviceStatus, Icon: Monitor },
    { label: 'Live sync', level: readiness.realtimeSyncStatus, Icon: Wifi },
  ];

  const allReady = items.every(i => i.level === 'READY');

  return (
    <section
      className="work-queue"
      aria-label="Room and device readiness"
      style={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p className="eyebrow">Video room readiness</p>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            {allReady ? 'All systems ready' : 'Readiness check required'}
          </h2>
        </div>
        <span className={`badge ${allReady ? '' : 'degraded'}`}>
          {allReady
            ? <><ShieldCheck style={{ width: 14, height: 14 }} aria-hidden="true" /> Ready</>
            : <><AlertTriangle style={{ width: 14, height: 14 }} aria-hidden="true" /> Action needed</>}
        </span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
        {items.map(({ label, level }) => (
          <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {readinessIcon(level)}
            <span style={{ flex: 1, fontSize: '0.88rem' }}>{label}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: level === 'READY' ? '#17653d' : level === 'DEGRADED' ? 'hsl(var(--held))' : 'hsl(var(--conflict))' }}>
              {readinessLabel(level)}
            </span>
          </li>
        ))}
      </ul>

      {readiness.networkQuality !== 'GOOD' && (
        <p style={{ marginTop: '0.75rem', color: 'hsl(var(--held))', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <WifiOff style={{ width: 13, height: 13 }} aria-hidden="true" />
          Network quality: {readiness.networkQuality.toLowerCase()}
        </p>
      )}

      <p style={{ marginTop: '0.75rem', color: 'hsl(var(--muted))', fontSize: '0.75rem' }}>
        Last checked: {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(readiness.lastCheckedAt))}
      </p>
    </section>
  );
}

// ── Minimum-necessary data notice ─────────────────────────────────────────────

export function MinimumNecessaryNotice() {
  return (
    <aside
      className="auth-notice"
      aria-label="Data minimization notice"
      style={{ marginBottom: '1.5rem', borderColor: 'hsl(var(--line))', background: '#f7fbfd' }}
    >
      <ShieldCheck aria-hidden="true" style={{ color: 'hsl(var(--trust))', flexShrink: 0 }} />
      <div>
        <h2 style={{ fontSize: '0.92rem', marginBottom: '4px' }}>Minimum-necessary data</h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'hsl(var(--muted))' }}>
          This workspace displays scheduling and attendance information only.
          Clinical documentation, diagnoses, medications, and patient notes
          remain in the authorised EHR system. Use your EHR for all clinical record-keeping.
        </p>
      </div>
    </aside>
  );
}

// ── Live announcement region ──────────────────────────────────────────────────

interface LiveAnnouncerProps {
  message: string;
}

export function LiveAnnouncer({ message }: LiveAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function ScheduleSkeleton() {
  return (
    <div className="work-queue" aria-busy="true" aria-label="Loading schedule">
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 48, background: '#f0f4f8', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

interface ErrorPanelProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorPanel({ title = 'Schedule unavailable', message, onRetry }: ErrorPanelProps) {
  return (
    <div className="staff-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message ?? 'Could not load data. Check your connection and try again.'}</p>
      </div>
      {onRetry && (
        <button className="button secondary" onClick={onRetry} style={{ whiteSpace: 'nowrap' }}>
          Try again
        </button>
      )}
    </div>
  );
}

// ── Offline banner ────────────────────────────────────────────────────────────

export function OfflineBanner() {
  return (
    <div role="alert" style={{ background: '#fff3e0', border: '1px solid #efc46a', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', fontSize: '0.88rem' }}>
      <WifiOff style={{ width: 16, height: 16, color: '#b76e00' }} aria-hidden="true" />
      <span>You appear to be offline. Schedule data may be out of date.</span>
    </div>
  );
}

// ── Degraded banner ───────────────────────────────────────────────────────────

export function DegradedBanner() {
  return (
    <div role="status" style={{ background: '#fff8ed', border: '1px solid #efc46a', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', fontSize: '0.88rem' }}>
      <AlertTriangle style={{ width: 16, height: 16, color: '#b76e00' }} aria-hidden="true" />
      <span>Realtime updates unavailable. Data refreshes every 15 seconds.</span>
    </div>
  );
}

// ── Workspace navigation tabs ─────────────────────────────────────────────────

export type ClinicianTab = 'schedule' | 'queue' | 'waiting-rooms' | 'help' | 'settings';

interface WorkspaceNavProps {
  activeTab: ClinicianTab;
  onTabChange: (tab: ClinicianTab) => void;
  waitingCount?: number;
}

export function WorkspaceNav({ activeTab, onTabChange, waitingCount }: WorkspaceNavProps) {
  const tabs: Array<{ id: ClinicianTab; label: string; badge?: number }> = [
    { id: 'schedule', label: 'My schedule' },
    { id: 'queue', label: 'Patient queue', badge: waitingCount },
    { id: 'waiting-rooms', label: 'Waiting rooms' },
    { id: 'help', label: 'Help' },
    { id: 'settings', label: 'Workspace settings' },
  ];

  return (
    <nav
      aria-label="Clinician workspace navigation"
      style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid hsl(var(--line))', marginBottom: '1.5rem', overflowX: 'auto' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          style={{
            border: 'none',
            background: 'none',
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 800 : 500,
            color: activeTab === tab.id ? 'hsl(var(--trust))' : 'hsl(var(--muted))',
            borderBottom: activeTab === tab.id ? '2px solid hsl(var(--trust))' : '2px solid transparent',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span
              aria-label={`${tab.badge} waiting`}
              style={{
                background: 'hsl(var(--trust))', color: 'white',
                borderRadius: 999, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700,
              }}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
