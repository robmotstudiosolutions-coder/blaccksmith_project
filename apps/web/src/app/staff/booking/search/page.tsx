'use client';

/**
 * /staff/booking/search — Staff-assisted booking Step 2: Search & Allocation.
 *
 * Uses the SAME shared booking state machine and components as patient self-service.
 * The BookingContext carries STAFF_ASSISTANCE authorizationBasis and the
 * verification reference obtained in Step 1.
 *
 * Security:
 * - Redirects to /staff/booking/patient if verification reference is missing.
 * - Staff cannot proceed without a verified subject patient.
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';
import { useSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { getAvailability, defaultBookingContext } from '@/lib/api/booking-client';
import { useSharedBooking } from '@/features/booking/hooks/use-shared-booking';
import { BookingResults } from '@/features/booking/components/booking-results';
import type { BookingContext } from '@/types/booking';

function StaffBookingSearch() {
  const { user } = useSession();
  const [subjectRef, setSubjectRef] = useState('');
  const [verificationRef, setVerificationRef] = useState('');

  // Read verified patient from URL params (set by /staff/booking/patient)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const verification = params.get('verification');

    if (!subject || !verification) {
      // No verified patient – redirect to verification step
      window.location.replace('/staff/booking/patient');
      return;
    }

    setSubjectRef(subject);
    setVerificationRef(verification);
  }, []);

  // Check permissions
  if (!can(user?.role, 'booking:staff_assist', 'staff_workspace', {
    subjectPatientId: subjectRef,
    verificationReference: verificationRef,
  })) {
    return (
      <section className="centered-page">
        <div className="access-card">
          <p className="eyebrow">Verification required</p>
          <h1>Patient verification needed</h1>
          <p>Verify the patient&apos;s identity before searching for appointments.</p>
          <a className="button" href="/staff/booking/patient">Start verification</a>
        </div>
      </section>
    );
  }

  if (!subjectRef || !verificationRef) {
    return (
      <section className="centered-page" aria-busy="true">
        <p>Checking verification…</p>
      </section>
    );
  }

  const bookingContext: BookingContext = {
    tenantId: 'main-hospital',
    actorId: user?.id ?? 'unknown',
    actorRole: 'BOOKING_STAFF',
    subjectPatientId: subjectRef,
    authorizationBasis: 'STAFF_ASSISTANCE',
    verificationReference: verificationRef,
  };

  return <StaffBookingFlow subjectRef={subjectRef} verificationRef={verificationRef} bookingContext={bookingContext} />;
}

interface StaffBookingFlowProps {
  subjectRef: string;
  verificationRef: string;
  bookingContext: BookingContext;
}

function StaffBookingFlow({ subjectRef, verificationRef, bookingContext }: StaffBookingFlowProps) {
  const clinicId = defaultBookingContext.clinicId;
  const typeId = defaultBookingContext.appointmentTypeId;

  const availability = useQuery({
    queryKey: ['staff-availability', clinicId, typeId],
    queryFn: () => getAvailability(clinicId, typeId),
  });

  const bookingFlow = useSharedBooking({
    selectedClinicId: clinicId,
    selectedTypeId: typeId,
    bookingContext,
    onAvailabilityRefetch: () => availability.refetch(),
  });

  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '36px 7vw 80px' }}>
      <div style={{ marginBottom: '1.5rem', padding: '16px 20px', background: '#f0f9ff', border: '1px solid #b9ddec', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <ShieldAlert style={{ color: 'hsl(var(--trust))', flexShrink: 0 }} aria-hidden="true" />
        <div>
          <p className="eyebrow" style={{ marginBottom: 2 }}>Staff-assisted booking · Step 2 of 2</p>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#315467' }}>
            Booking on behalf of patient <strong>{subjectRef}</strong>.
            Verification reference: <code>{verificationRef}</code>.
            This action is audited.
          </p>
        </div>
      </div>

      {/* Live announcement for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {bookingFlow.announcement}
      </div>

      <BookingResults
        user={undefined}
        selectedSpecialty={undefined}
        isOnlineBookable={true}
        isLoading={availability.isLoading}
        isError={availability.isError}
        errorMessage={(availability.error as Error)?.message}
        slots={availability.data}
        attempt={bookingFlow.attempt}
        selectedSlot={bookingFlow.selected}
        hold={bookingFlow.hold}
        secondsRemaining={bookingFlow.seconds}
        booking={bookingFlow.booking}
        actionMessage={bookingFlow.message}
        alternatives={bookingFlow.alternatives}
        busy={bookingFlow.busy}
        onSelectSlot={bookingFlow.choose}
        onConfirmHold={bookingFlow.confirm}
        onCancelBooking={bookingFlow.cancel}
        onResetSearch={bookingFlow.reset}
        onRefetchAvailability={() => availability.refetch()}
      />
    </section>
  );
}

export default function StaffBookingSearchPage() {
  return (
    <AccessGate requireStaff>
      <main>
        <AppHeader staff />
        <StaffBookingSearch />
      </main>
    </AccessGate>
  );
}
