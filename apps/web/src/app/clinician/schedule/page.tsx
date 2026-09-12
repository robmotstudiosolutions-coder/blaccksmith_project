'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';
import { useSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { ScheduleTable, ScheduleSkeleton, ErrorPanel, LiveAnnouncer } from '@/components/clinician-ui';
import { getClinicianSchedule } from '@/features/clinician/service';

const DEMO_CLINICIAN_ID = '00000000-0000-4000-8000-000000000301';

function ClinicianScheduleContent() {
  const { user, ready } = useSession();

  const scheduleQuery = useQuery({
    queryKey: ['clinician-schedule', DEMO_CLINICIAN_ID],
    queryFn: () => getClinicianSchedule(DEMO_CLINICIAN_ID),
    refetchInterval: 30_000,
    enabled: ready && can(user?.role, 'clinician:view_schedule'),
  });

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

export default function ClinicianSchedulePage() {
  return (
    <AccessGate permission="clinician:view_schedule">
      <ClinicianScheduleContent />
    </AccessGate>
  );
}

