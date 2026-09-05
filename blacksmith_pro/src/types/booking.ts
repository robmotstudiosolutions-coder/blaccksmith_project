export type SlotAvailabilityState = 'PROVISIONAL' | 'HELD_BY_THIS_SESSION' | 'HELD_BY_OTHER' | 'BOOKED' | 'BLOCKED' | 'EXPIRED' | 'UNKNOWN' | 'STALE';
export type BookingAttemptState = 'IDLE' | 'HOLDING' | 'HELD' | 'COMMITTING' | 'CONFIRMED' | 'RACE_LOST' | 'PENDING_RESOLUTION' | 'EXPIRED' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL';
export type Role = 'PATIENT' | 'CAREGIVER' | 'BOOKING_STAFF' | 'CLINIC_ADMIN' | 'CLINICIAN' | 'OPERATIONS_MANAGER' | 'AUDITOR';
export type Scenario = 'success' | 'conflict' | 'expired' | 'pending' | 'degraded';

export type Slot = { slotId: string; slotVersion: number; clinicId: string; clinicName: string; clinicianId: string; clinicianName: string; appointmentTypeId: string; appointmentType: string; startsAt: string; endsAt: string; mode: 'IN_PERSON' | 'VIDEO'; availabilityState: SlotAvailabilityState; lastUpdatedAt: string; sourceAuthority: 'SLOTSURE'; freshnessState: 'FRESH' | 'STALE' };
export type AlternativeSlot = Slot & { similarity: string };
export type Booking = { bookingId: string; reference: string; slot: Slot; status: 'CONFIRMED'; createdAt: string };
export type ApiError = { code: string; message: string; retryable: boolean; bookingCreated?: boolean; alternatives?: AlternativeSlot[]; correlationId: string; retryAfterSeconds?: number };
