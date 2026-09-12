'use client';

/**
 * /clinician — P0 Clinician Workspace
 *
 * Protected: requires CLINICIAN role (or CLINIC_ADMIN for oversight).
 *
 * HIPAA minimum-necessary: Patient identity is restricted to safe
 * references and initials. Clinical notes remain in the EHR.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccessGate } from '@/components/access-gate';
import { AppHeader } from '@/components/app-header';
import { useSession } from '@/lib/session';
import {
  ClinicianWorkspaceHeader,
  ClinicianMetricsBar,
  WorkspaceNav,
  ScheduleTable,
  PatientQueuePanel,
  RoomReadinessPanel,
  MinimumNecessaryNotice,
  LiveAnnouncer,
  ErrorPanel,
  OfflineBanner,
  DegradedBanner,
  ScheduleSkeleton,
  type ClinicianTab,
} from '@/components/clinician-ui';
import {
  getClinicianProfile,
  getClinicianSchedule,
  getClinicianQueue,
  getClinicianMetrics,
  getRoomReadiness,
  startEncounter,
  updateAvailabilityStatus,
} from '@/features/clinician/service';
import type {
  ClinicianAvailabilityStatus,
  QueueEntry,
  ScheduleItem,
} from '@/features/clinician/data';

// ── Default clinician ID (replaced by session claims in production) ────────────
const DEMO_CLINICIAN_ID = '00000000-0000-4000-8000-000000000301';

// ── Main workspace ─────────────────────────────────────────────────────────────

function ClinicianWorkspace() {
  const { user } = useSession();
  const clinicianId = DEMO_CLINICIAN_ID; // In production: derive from session claim

  const [activeTab, setActiveTab] = useState<ClinicianTab>('schedule');
  const [announcement, setAnnouncement] = useState('');
  const [startingId, setStartingId] = useState<string>();
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());
  const [isOffline, setIsOffline] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const profileQuery = useQuery({
    queryKey: ['clinician-profile', clinicianId],
    queryFn: () => getClinicianProfile(clinicianId),
    staleTime: 5 * 60_000,
  });

  const scheduleQuery = useQuery({
    queryKey: ['clinician-schedule', clinicianId],
    queryFn: () => getClinicianSchedule(clinicianId),
    refetchInterval: 30_000, // 30-second polling fallback
  });

  const queueQuery = useQuery({
    queryKey: ['clinician-queue', clinicianId],
    queryFn: () => getClinicianQueue(clinicianId),
    refetchInterval: 15_000, // 15-second polling for queue (higher urgency)
  });

  const metricsQuery = useQuery({
    queryKey: ['clinician-metrics', clinicianId],
    queryFn: () => getClinicianMetrics(clinicianId),
    refetchInterval: 30_000,
  });

  const readinessQuery = useQuery({
    queryKey: ['room-readiness', clinicianId],
    queryFn: () => getRoomReadiness(clinicianId),
    refetchInterval: 60_000,
  });

  // ── Online/offline detection ──────────────────────────────────────────────

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      void handleRefresh();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  });

  // Detect degraded realtime (queries consistently failing = polling only)
  useEffect(() => {
    const failed = scheduleQuery.isError || queueQuery.isError;
    setIsDegraded(failed && !isOffline);
  }, [scheduleQuery.isError, queueQuery.isError, isOffline]);

  // ── Manual refresh ────────────────────────────────────────────────────────

  const refreshing = scheduleQuery.isFetching || queueQuery.isFetching;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      scheduleQuery.refetch(),
      queueQuery.refetch(),
      metricsQuery.refetch(),
      readinessQuery.refetch(),
    ]);
    setLastRefreshed(new Date().toISOString());
    setAnnouncement('Schedule and queue refreshed.');
  }, [scheduleQuery, queueQuery, metricsQuery, readinessQuery]);

  // ── Encounter start ───────────────────────────────────────────────────────

  const handleStartEncounterFromSchedule = useCallback(async (item: ScheduleItem) => {
    setStartingId(item.scheduleItemId);
    try {
      const { encounterId } = await startEncounter(item.scheduleItemId);
      setAnnouncement(`Encounter started for patient ${item.safePatientReference}.`);
      window.location.assign(`/clinician/encounters/${encounterId}`);
    } catch {
      setAnnouncement('Could not start encounter. Please try again.');
    } finally {
      setStartingId(undefined);
    }
  }, []);

  const handleStartEncounterFromQueue = useCallback(async (entry: QueueEntry) => {
    setStartingId(entry.queueId);
    try {
      const { encounterId } = await startEncounter(entry.scheduleItemId);
      setAnnouncement(`Encounter started for patient ${entry.safePatientReference}.`);
      window.location.assign(`/clinician/encounters/${encounterId}`);
    } catch {
      setAnnouncement('Could not start encounter. Please try again.');
    } finally {
      setStartingId(undefined);
    }
  }, []);

  // ── Availability status change ─────────────────────────────────────────────

  const handleStatusChange = useCallback(async (status: ClinicianAvailabilityStatus) => {
    await updateAvailabilityStatus(clinicianId, status);
    await profileQuery.refetch();
    setAnnouncement(`Availability status updated to ${status.replace('_', ' ').toLowerCase()}.`);
  }, [clinicianId, profileQuery]);

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!profileQuery.data && profileQuery.isLoading) {
    return (
      <main>
        <AppHeader />
        <section className="staff-page" aria-busy="true">
          <ScheduleSkeleton />
        </section>
      </main>
    );
  }

  if (profileQuery.isError && !profileQuery.data) {
    return (
      <main>
        <AppHeader />
        <section className="staff-page">
          <ErrorPanel
            title="Workspace unavailable"
            message="Could not load your clinician profile. Check your connection."
            onRetry={() => void profileQuery.refetch()}
          />
        </section>
      </main>
    );
  }

  const profile = profileQuery.data!;
  const schedule = scheduleQuery.data ?? [];
  const queue = queueQuery.data ?? [];
  const metrics = metricsQuery.data;
  const readiness = readinessQuery.data;

  return (
    <main>
      <AppHeader />

      <section className="staff-page">

        {/* Live accessible announcements */}
        <LiveAnnouncer message={announcement} />

        {/* Status banners */}
        {isOffline && <OfflineBanner />}
        {isDegraded && !isOffline && <DegradedBanner />}

        {/* Workspace header */}
        <ClinicianWorkspaceHeader
          profile={profile}
          onChangeStatus={handleStatusChange}
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
          lastRefreshed={lastRefreshed}
        />

        {/* Minimum-necessary data notice */}
        <MinimumNecessaryNotice />

        {/* Metrics bar */}
        {metrics && <ClinicianMetricsBar metrics={metrics} />}

        {/* Workspace navigation */}
        <WorkspaceNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          waitingCount={queue.length}
        />

        {/* Tab panels */}
        <div id="panel-schedule" role="tabpanel" aria-label="My schedule" hidden={activeTab !== 'schedule'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p className="eyebrow">Today's appointments</p>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
                {schedule.length} appointment{schedule.length !== 1 ? 's' : ''}
              </h2>
            </div>
          </div>

          {scheduleQuery.isLoading && <ScheduleSkeleton />}
          {scheduleQuery.isError && (
            <ErrorPanel onRetry={() => void scheduleQuery.refetch()} />
          )}
          {!scheduleQuery.isLoading && (
            <ScheduleTable
              items={schedule}
              onStartEncounter={handleStartEncounterFromSchedule}
              startingEncounterId={startingId}
            />
          )}
        </div>

        <div id="panel-queue" role="tabpanel" aria-label="Patient queue" hidden={activeTab !== 'queue'}>
          <div style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">Waiting patients</p>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
              {queue.length} patient{queue.length !== 1 ? 's' : ''} waiting
            </h2>
          </div>
          {queueQuery.isLoading && <ScheduleSkeleton />}
          {queueQuery.isError && (
            <ErrorPanel onRetry={() => void queueQuery.refetch()} />
          )}
          {!queueQuery.isLoading && (
            <PatientQueuePanel
              entries={queue}
              onStartEncounter={handleStartEncounterFromQueue}
              startingEntryId={startingId}
            />
          )}
        </div>

        <div id="panel-waiting-rooms" role="tabpanel" aria-label="Waiting rooms" hidden={activeTab !== 'waiting-rooms'}>
          <div style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">Room and device readiness</p>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Video visit preparation</h2>
          </div>
          {readiness && <RoomReadinessPanel readiness={readiness} />}
        </div>

        <div id="panel-help" role="tabpanel" aria-label="Help" hidden={activeTab !== 'help'}>
          <div style={{ maxWidth: 680 }}>
            <p className="eyebrow">Clinician workspace help</p>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Getting support</h2>
            <p>For clinical documentation and patient records, use the authorised EHR system.</p>
            <p>For scheduling issues, contact your clinic administrator or the booking team.</p>
            <p>For technical support with this workspace, visit the <a href="/help">full help centre</a>.</p>
            <p style={{ marginTop: '1.5rem' }}>
              <strong>Do not use SlotSure for emergency situations.</strong>{' '}
              Direct patients to emergency services or your local hospital for urgent care.
            </p>
          </div>
        </div>

        <div id="panel-settings" role="tabpanel" aria-label="Workspace settings" hidden={activeTab !== 'settings'}>
          <div style={{ maxWidth: 680 }}>
            <p className="eyebrow">Workspace preferences</p>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Settings</h2>
            <p style={{ color: 'hsl(var(--muted))' }}>
              Workspace settings are managed by your clinic administrator.
              Contact your admin to update schedule visibility or notification preferences.
            </p>
          </div>
        </div>

      </section>
    </main>
  );
}

// ── Access gate ────────────────────────────────────────────────────────────────

export default function ClinicianPage() {
  return (
    <AccessGate permission="clinician:view_schedule">
      <ClinicianWorkspace />
    </AccessGate>
  );
}
