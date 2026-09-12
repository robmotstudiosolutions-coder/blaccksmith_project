// ── Availability & Attempt States ────────────────────────────────────────────

/** Browser-side slot availability. Always provisional – never authoritative. */
export type SlotAvailabilityState =
  | 'PROVISIONAL'
  | 'HELD_BY_THIS_SESSION'
  | 'HELD_BY_OTHER'
  | 'BOOKED'
  | 'BLOCKED'
  | 'EXPIRED'
  | 'UNKNOWN'
  | 'STALE';

/**
 * Typed booking attempt state machine.
 * Terminal states: CONFIRMED, RACE_LOST, EXPIRED, FAILED_TERMINAL.
 * PROVISIONAL availability can NEVER directly yield CONFIRMED.
 */
export type BookingAttemptState =
  | 'IDLE'
  | 'HOLDING'
  | 'HELD'
  | 'COMMITTING'
  | 'CONFIRMED'
  | 'RACE_LOST'
  | 'PENDING_RESOLUTION'
  | 'EXPIRED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_TERMINAL'
  // Cancellation states (separate from booking attempt)
  | 'CANCELLING'
  | 'CANCELLED';

// ── Domain Roles ─────────────────────────────────────────────────────────────

import type { UserRole } from '@slotsure/domain';

export type BookingActorRole = 'PATIENT' | 'CAREGIVER' | 'BOOKING_STAFF';
export type AppRole = UserRole;

export type AuthorizationBasis =
  | 'SELF'
  | 'CAREGIVER_DELEGATION'
  | 'STAFF_ASSISTANCE';

// ── Booking Context & Intent ──────────────────────────────────────────────────

/**
 * Shared booking context carried by both patient self-service and
 * staff-assisted flows.  The API derives actor identity and tenant
 * from authenticated session claims and validates these assertions.
 */
export type BookingContext = {
  tenantId: string;
  actorId: string;
  actorRole: BookingActorRole;
  subjectPatientId: string;
  authorizationBasis: AuthorizationBasis;
  /** Provided by booking staff only – opaque verification receipt. */
  verificationReference?: string;
};

export type VisitMode = 'VIDEO' | 'IN_CLINIC';

export type BookingIntent = {
  clinicId: string;
  clinicianId?: string;
  appointmentTypeId: string;
  slotId: string;
  slotVersion: number;
  mode: VisitMode;
  context: BookingContext;
};

// ── Slot ─────────────────────────────────────────────────────────────────────

export type Slot = {
  slotId: string;
  slotVersion: number;
  clinicId: string;
  clinicName: string;
  clinicianId: string;
  clinicianName: string;
  appointmentTypeId: string;
  appointmentType: string;
  startsAt: string;
  endsAt: string;
  mode: 'IN_PERSON' | 'VIDEO';
  availabilityState: SlotAvailabilityState;
  lastUpdatedAt: string;
  sourceAuthority: 'SLOTSURE';
  freshnessState: 'FRESH' | 'STALE';
};

export type AlternativeSlot = Slot & { similarity: string };

// ── Booking & Error ───────────────────────────────────────────────────────────

export type Booking = {
  bookingId: string;
  reference: string;
  slot: Slot;
  status: 'CONFIRMED';
  createdAt: string;
};

export type ApiError = {
  code: string;
  message: string;
  retryable: boolean;
  bookingCreated?: boolean;
  alternatives?: AlternativeSlot[];
  correlationId: string;
  retryAfterSeconds?: number;
};

// ── Scenario (dev-only) ───────────────────────────────────────────────────────

export type Scenario = 'success' | 'conflict' | 'expired' | 'pending' | 'degraded';
