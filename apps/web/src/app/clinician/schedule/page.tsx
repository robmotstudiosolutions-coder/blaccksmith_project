'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/app-header';
import { useSession } from '@/lib/session';
import { ScheduleTable, ScheduleSkeleton, ErrorPanel, LiveAnnouncer } from '@/components/clinician-ui';
import { getClinicianSchedule } from '@/features/clinician/service';

const DEMO_CLINICIAN_ID = '00000000-0000-4000-8000-000000000301';

export default function ClinicianSchedulePage() {
  const { user, ready } = useSession();

  const scheduleQuery = useQuery({
    queryKey: ['clinician-schedule', DEMO_CLINICIAN_ID],
    queryFn: () => getClinicianSchedule(DEMO_CLINICIAN_ID),
    refetchInterval: 30_000,
    enabled: ready && (user?.role === 'CLINICIAN' || user?.role === 'CLINIC_ADMIN'),
  });

  if (!ready || !user) {
    return (
      <main>
        <AppHeader />
        <section className="centered-page"><p>Checking session…</p></section>
      </main>
    );
  }

  return (
    <main>
      <AppHeader />
      <section className="staff-page">
        <LiveAnnouncer message={scheduleQuery.isFetching ? 'Refreshing schedule…' : ''} />
        <p className="eyebrow">Clinician workspace</p>
        <h1>My full schedule</h1>
        {scheduleQuery.isLoading && <ScheduleSkeleton />}
        {scheduleQuery.isError && <ErrorPanel onRetry={() => void scheduleQuery.refetch()} />}
        {scheduleQuery.data && (
          <ScheduleTable items={scheduleQuery.data} />
        )}
      </section>
    </main>
  );
}
