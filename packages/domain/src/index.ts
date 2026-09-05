export const userRoles = ['PATIENT', 'CAREGIVER', 'CLINICIAN', 'BOOKING_STAFF', 'CLINIC_ADMIN', 'SYSTEM_ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];
export const slotStates = ['PUBLISHED', 'HELD', 'BOOKED', 'EXPIRED', 'BLOCKED', 'CANCEL_PENDING', 'RELEASE_PENDING', 'ERROR'] as const;
export type SlotState = (typeof slotStates)[number];
export const holdStatuses = ['ACTIVE', 'COMMITTED', 'EXPIRED', 'RELEASED'] as const;
export type HoldStatus = (typeof holdStatuses)[number];
export const bookingStatuses = ['CONFIRMED', 'CANCEL_PENDING', 'CANCELLED', 'RESCHEDULED', 'ERROR'] as const;
export type BookingStatus = (typeof bookingStatuses)[number];
export const activeBookingStatuses = ['CONFIRMED', 'CANCEL_PENDING'] as const satisfies readonly BookingStatus[];

export const applicationErrorCodes = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'SLOT_NOT_FOUND',
  'SLOT_NOT_AVAILABLE',
  'HOLD_EXPIRED',
  'BOOKING_CONFLICT',
  'IDEMPOTENCY_REPLAY',
  'ELIGIBILITY_FAILED',
  'INTEGRATION_UNAVAILABLE',
  'BOOKING_STATE_UNKNOWN',
  'INTERNAL_ERROR',
  'TELEHEALTH_TOO_EARLY',
  'TELEHEALTH_EXPIRED',
  'TELEHEALTH_UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'USER_ALREADY_EXISTS',
  'SESSION_EXPIRED'
] as const;
export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];


export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  constructor(code: ApplicationErrorCode, message: string, statusCode: number, retryable = false, details?: Record<string, unknown>) { super(message); this.name = 'ApplicationError'; this.code = code; this.statusCode = statusCode; this.retryable = retryable; this.details = details; }
}

const slotTransitions: Record<SlotState, readonly SlotState[]> = { PUBLISHED: ['HELD', 'BLOCKED', 'ERROR'], HELD: ['PUBLISHED', 'BOOKED', 'EXPIRED', 'ERROR'], BOOKED: ['CANCEL_PENDING', 'ERROR'], EXPIRED: ['PUBLISHED', 'BLOCKED', 'ERROR'], BLOCKED: ['PUBLISHED', 'ERROR'], CANCEL_PENDING: ['RELEASE_PENDING', 'ERROR'], RELEASE_PENDING: ['PUBLISHED', 'BLOCKED', 'ERROR'], ERROR: [] };
export const canTransitionSlot = (from: SlotState, to: SlotState) => slotTransitions[from].includes(to);
