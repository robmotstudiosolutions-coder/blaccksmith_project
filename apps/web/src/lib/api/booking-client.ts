import type { ApiError, Booking, Slot } from '@/types/booking';

export const defaultBookingContext = {
  clinicId: '00000000-0000-4000-8000-000000000101',
  appointmentTypeId: '00000000-0000-4000-8000-000000000201'
};

export type Clinic = { id: string; name: string; hospitalName: string; locationReference: string };
export type AppointmentType = { id: string; clinicId: string; name: string; durationMinutes: number };
export type StaffMetric = { label: string; value: string; note: string };
export type ReconciliationItem = { id: string; slotId: string; safeReference: string; category: string; ageMinutes: number; nextSafeAction: string };
export type AuditEventItem = { id: string; action: string; targetType: string; targetId: string | null; outcome: string; correlationId: string; occurredAt: string };
export type Clinician = { id: string; name: string; specialty: string | null };
export type PatientAppointment = {
  bookingId: string;
  reference: string;
  slotId: string;
  clinicName: string;
  clinicianName: string;
  appointmentType: string;
  mode: 'IN_PERSON' | 'VIDEO';
  startsAt: string;
  endsAt: string;
  status: string;
  canJoinVideo: boolean;
  videoOpensAt?: string;
};
export type TelehealthTokenResponse = {
  bookingId: string;
  roomName: string;
  token: string;
  participantId: string;
  participantName: string;
  role: 'PATIENT' | 'CLINICIAN' | 'OBSERVER';
  appointmentStartTime: string;
  appointmentEndTime: string;
  expiresAt: string;
};


type ApiSlot = { slotId: string; clinicId: string; clinicName: string; appointmentTypeId: string; appointmentType: string; mode: 'IN_PERSON' | 'VIDEO'; clinicianId: string | null; clinicianName: string | null; startsAt: string; endsAt: string; version: number; state: string };

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`/api/booking/${path}`, { ...init, headers: { accept: 'application/json', ...init?.headers }, cache: 'no-store' });
  } catch {
    throw <ApiError>{ code: 'SERVICE_UNAVAILABLE', message: 'Booking services are not available. Please try again shortly.', retryable: true };
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw payload as ApiError;
  return payload as T;
};

const toSlot = (slot: ApiSlot): Slot => ({ slotId: slot.slotId, slotVersion: slot.version, clinicId: slot.clinicId, clinicName: slot.clinicName, clinicianId: slot.clinicianId ?? 'unassigned', clinicianName: slot.clinicianName ?? 'Care team', appointmentTypeId: slot.appointmentTypeId, appointmentType: slot.appointmentType, startsAt: slot.startsAt, endsAt: slot.endsAt, mode: slot.mode, availabilityState: 'PROVISIONAL', freshnessState: 'FRESH', lastUpdatedAt: new Date().toISOString(), sourceAuthority: 'SLOTSURE' });

export async function getClinics(): Promise<Clinic[]> {
  const result = await request<{ clinics: Clinic[] }>('clinics');
  return result.clinics;
}

export async function getAppointmentTypes(clinicId?: string): Promise<AppointmentType[]> {
  const query = clinicId ? `?clinicId=${clinicId}` : '';
  const result = await request<{ appointmentTypes: AppointmentType[] }>(`appointment-types${query}`);
  return result.appointmentTypes;
}

export async function getAvailability(clinicId: string = defaultBookingContext.clinicId, appointmentTypeId: string = defaultBookingContext.appointmentTypeId): Promise<Slot[]> {
  const query = new URLSearchParams({ clinicId, appointmentTypeId });
  const result = await request<{ slots: ApiSlot[] }>(`availability?${query}`);
  return result.slots.map(toSlot);
}

export async function createHold(slotId: string, idempotencyKey: string): Promise<{ holdId: string; expiresAt: string }> {
  return request('holds', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ slotId }) });
}

export async function commitHold(holdId: string, idempotencyKey: string, slot: Slot): Promise<Booking> {
  const result = await request<{ bookingId: string; status: 'CONFIRMED'; correlationId: string }>(`holds/${holdId}/commit`, { method: 'POST', headers: { 'idempotency-key': idempotencyKey } });
  return { bookingId: result.bookingId, reference: result.correlationId, slot, status: result.status, createdAt: new Date().toISOString() };
}

export async function cancelBooking(bookingId: string, idempotencyKey: string): Promise<{ bookingId: string; status: 'CANCEL_PENDING'; correlationId: string }> {
  return request(`bookings/${bookingId}/cancel`, { method: 'POST', headers: { 'idempotency-key': idempotencyKey } });
}

export async function getAlternatives(clinicId: string = defaultBookingContext.clinicId, appointmentTypeId: string = defaultBookingContext.appointmentTypeId): Promise<Slot[]> {
  const query = new URLSearchParams({ clinicId, appointmentTypeId });
  const result = await request<{ slots: ApiSlot[] }>(`alternatives?${query}`);
  return result.slots.map(toSlot);
}

export async function getStaffMetrics(): Promise<StaffMetric[]> {
  const result = await request<{ metrics: StaffMetric[] }>('staff/metrics');
  return result.metrics;
}

export async function getReconciliationQueue(): Promise<ReconciliationItem[]> {
  const result = await request<{ items: ReconciliationItem[] }>('staff/reconciliation');
  return result.items;
}

export async function releaseSlot(slotId: string): Promise<{ success: boolean; slotId: string; state: 'PUBLISHED' }> {
  return request(`staff/slots/${slotId}/release`, { method: 'POST' });
}

export async function getAuditEvents(limit = 20): Promise<AuditEventItem[]> {
  const result = await request<{ events: AuditEventItem[] }>(`staff/audit?limit=${limit}`);
  return result.events;
}

export async function getClinicians(clinicId?: string, specialty?: string): Promise<Clinician[]> {
  const params = new URLSearchParams();
  if (clinicId) params.set('clinicId', clinicId);
  if (specialty) params.set('specialty', specialty);
  const q = params.toString() ? `?${params.toString()}` : '';
  const result = await request<{ clinicians: Clinician[] }>(`clinicians${q}`);
  return result.clinicians;
}

export async function getPatientAppointments(): Promise<PatientAppointment[]> {
  const result = await request<{ appointments: PatientAppointment[] }>('patients/me/appointments');
  return result.appointments;
}

export async function rescheduleBooking(bookingId: string, newSlotId: string, idempotencyKey: string): Promise<{ bookingId: string; status: 'CONFIRMED'; correlationId: string }> {
  return request(`bookings/${bookingId}/reschedule`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
    body: JSON.stringify({ newSlotId })
  });
}

export async function getTelehealthToken(bookingId: string): Promise<TelehealthTokenResponse> {
  return request(`appointments/${bookingId}/telehealth/token`, {
    method: 'POST'
  });
}

/**
 * Poll the outcome of a booking attempt by idempotency key.
 * Used to resolve PENDING_RESOLUTION state after network failure.
 * Returns the booking if confirmed, or null/throws if still pending or race-lost.
 */
export async function getBookingAttempt(idempotencyKey: string): Promise<import('@/types/booking').Booking | null> {
  try {
    const result = await request<{ bookingId?: string; status?: string; correlationId?: string; outcome?: string }>(
      `booking-attempts/${idempotencyKey}`
    );
    if (result.status === 'CONFIRMED' && result.bookingId) {
      // Reconstruct a minimal booking object from the attempt response
      return {
        bookingId: result.bookingId,
        reference: result.correlationId ?? idempotencyKey,
        // Slot details come from local state; server confirms the booking only
        slot: null as unknown as import('@/types/booking').Slot,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      };
    }
    if (result.outcome === 'RACE_LOST') {
      throw { code: 'BOOKING_OUTCOME_RACE_LOST', message: 'That appointment was taken. No booking was created.', retryable: false, bookingCreated: false, correlationId: idempotencyKey };
    }
    return null; // Still pending
  } catch (err) {
    const apiErr = err as { code?: string };
    if (apiErr.code === 'BOOKING_OUTCOME_RACE_LOST') throw err;
    return null;
  }
}

