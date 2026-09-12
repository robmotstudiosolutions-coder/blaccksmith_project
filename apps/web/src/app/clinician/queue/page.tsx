'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';
import { useSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { PatientQueuePanel, ScheduleSkeleton, ErrorPanel, LiveAnnouncer } from '@/components/clinician-ui';
import { getClinicianQueue, startEncounter } from '@/features/clinician/service';
import type { QueueEntry } from '@/features/clinician/data';

const DEMO_CLINICIAN_ID = '00000000-0000-4000-8000-000000000301';

function ClinicianQueueContent() {
  const { user, ready } = useSession();
  const [startingId, setStartingId] = useState<string>();
  const [announcement, setAnnouncement] = useState('');

  const queueQuery = useQuery({
    queryKey: ['clinician-queue', DEMO_CLINICIAN_ID],
    queryFn: () => getClinicianQueue(DEMO_CLINICIAN_ID),
    refetchInterval: 15_000,
    enabled: ready && can(user?.role, 'clinician:view_queue'),
  });

  const handleStart = useCallback(async (entry: QueueEntry) => {
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

  return (
    <main>
      <AppHeader />
      <section className="staff-page">
        <LiveAnnouncer message={announcement} />
        <p className="eyebrow">Clinician workspace</p>
        <h1>Patient queue</h1>
        <p style={{ color: 'hsl(var(--muted))', marginBottom: '1.5rem' }}>
          Patients who have checked in and are ready for their appointment.
          Updates every 15 seconds.
        </p>
        {queueQuery.isLoading && <ScheduleSkeleton />}
        {queueQuery.isError && <ErrorPanel onRetry={() => void queueQuery.refetch()} />}
        {queueQuery.data && (
          <PatientQueuePanel
            entries={queueQuery.data}
            onStartEncounter={handleStart}
            startingEntryId={startingId}
          />
        )}
      </section>
    </main>
  );
}

export default function ClinicianQueuePage() {
  return (
    <AccessGate permission="clinician:view_queue">
      <ClinicianQueueContent />
    </AccessGate>
  );
}

