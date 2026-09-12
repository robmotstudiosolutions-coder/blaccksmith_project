'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { useSession } from '@/lib/session';
import { specialties, type Specialty } from '@/lib/specialties';
import {
  defaultBookingContext,
  getAppointmentTypes,
  getAvailability,
  getClinics
} from '@/lib/api/booking-client';
import { SpecialtyDirectory } from '@/features/catalog/components/specialty-directory';
import { SearchPanel } from '@/features/catalog/components/search-panel';
import { BookingResults } from '@/features/booking/components/booking-results';
import { useSharedBooking } from '@/features/booking/hooks/use-shared-booking';
import type { BookingContext } from '@/types/booking';

export default function Home() {
  const { user } = useSession();
  const [selectedClinicId, setSelectedClinicId] = useState<string>(
    defaultBookingContext.clinicId
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    defaultBookingContext.appointmentTypeId
  );
  const [directoryMessage, setDirectoryMessage] = useState('');

  // Catalog queries
  const clinicsQuery = useQuery({ queryKey: ['clinics'], queryFn: getClinics });
  const selectedSpecialty =
    specialties.find(item => item.clinicId === selectedClinicId) ??
    specialties.find(item => `directory:${item.name}` === selectedClinicId);
  const isOnlineBookable = Boolean(
    selectedSpecialty?.clinicId && selectedSpecialty?.appointmentTypeId
  );

  const typesQuery = useQuery({
    queryKey: ['appointmentTypes', selectedClinicId],
    queryFn: () => getAppointmentTypes(selectedClinicId),
    enabled: isOnlineBookable
  });

  // Availability query
  const availability = useQuery({
    queryKey: ['availability', selectedClinicId, selectedTypeId],
    queryFn: () => getAvailability(selectedClinicId, selectedTypeId),
    enabled: isOnlineBookable && Boolean(selectedTypeId)
  });

  // Sync selected clinic/type when catalog loads
  useEffect(() => {
    if (clinicsQuery.data && clinicsQuery.data.length > 0 && !selectedClinicId) {
      setSelectedClinicId(clinicsQuery.data[0].id);
    }
  }, [clinicsQuery.data, selectedClinicId]);

  useEffect(() => {
    if (typesQuery.data && typesQuery.data.length > 0) {
      if (!typesQuery.data.some(t => t.id === selectedTypeId)) {
        setSelectedTypeId(typesQuery.data[0].id);
      }
    }
  }, [typesQuery.data, selectedTypeId]);

  // Shared Booking Context for patient / caregiver
  const bookingContext: BookingContext = useMemo(() => {
    const isCaregiver = user?.role === 'CAREGIVER';
    return {
      tenantId: 'main-hospital',
      actorId: user?.id ?? 'guest-patient',
      actorRole: isCaregiver ? 'CAREGIVER' : 'PATIENT',
      subjectPatientId: user?.id ?? 'guest-patient',
      authorizationBasis: isCaregiver ? 'CAREGIVER_DELEGATION' : 'SELF',
    };
  }, [user]);

  // Universal Booking Flow Hook
  const bookingFlow = useSharedBooking({
    selectedClinicId,
    selectedTypeId,
    bookingContext,
    onAvailabilityRefetch: async () => availability.refetch()
  });

  const handleSelectSpecialty = (specialty: Specialty) => {
    setSelectedClinicId(specialty.clinicId ?? `directory:${specialty.name}`);
    setSelectedTypeId(specialty.appointmentTypeId ?? '');
    setDirectoryMessage(
      specialty.clinicId
        ? `${specialty.name} has live online appointment availability.`
        : `${specialty.name} is in our specialist directory. Online appointment inventory for this service is being added by the clinic.`
    );
    document.getElementById('appointments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectClinic = (clinicId: string) => {
    const specialty =
      specialties.find(item => item.clinicId === clinicId) ??
      specialties.find(item => `directory:${item.name}` === clinicId);
    setSelectedClinicId(clinicId);
    setSelectedTypeId(specialty?.appointmentTypeId ?? '');
    setDirectoryMessage(
      specialty?.clinicId
        ? ''
        : `${specialty?.name ?? 'This service'} does not have online appointments yet.`
    );
  };

  return (
    <main>
      <AppHeader />

      {/* Hero Section */}
      <section className="hero">
        <div>
          <p className="eyebrow">Hospital clinic booking</p>
          <h1>Find care with confidence.</h1>
          <p className="lead">
            Appointment times are checked live. A time is confirmed only after the hospital
            securely completes your booking.
          </p>
        </div>
        <aside className="trust-card">
          <ShieldCheck />
          <div>
            <strong>Fair, secure allocation</strong>
            <p>If a time becomes unavailable, we will explain clearly and show other options.</p>
          </div>
        </aside>
      </section>

      {/* Clinical Specialty Directory */}
      <SpecialtyDirectory
        onSelectSpecialty={handleSelectSpecialty}
        directoryMessage={directoryMessage}
      />

      {/* Live announcement for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {bookingFlow.announcement}
      </div>

      {/* Booking Search & Results Layout */}
      <section className="layout" id="appointments">
        <SearchPanel
          selectedClinicId={selectedClinicId}
          selectedTypeId={selectedTypeId}
          isOnlineBookable={isOnlineBookable}
          busy={bookingFlow.busy}
          isFetchingAvailability={availability.isFetching}
          appointmentTypes={typesQuery.data}
          onSelectClinic={handleSelectClinic}
          onSelectType={setSelectedTypeId}
          onSearch={bookingFlow.reset}
        />

        <BookingResults
          user={user}
          selectedSpecialty={selectedSpecialty}
          isOnlineBookable={isOnlineBookable}
          isLoading={availability.isLoading}
          isError={availability.isError}
          errorMessage={(availability.error as any)?.message}
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

      {/* Footer Support */}
      <footer id="support" className="support">
        <strong>Need help?</strong> Contact your clinic directly for urgent care or clinical advice.
        Do not use online booking for emergencies.
      </footer>
    </main>
  );
}
