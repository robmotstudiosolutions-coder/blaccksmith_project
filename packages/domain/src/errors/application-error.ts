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

  constructor(
    code: ApplicationErrorCode,
    message: string,
    statusCode: number,
    retryable = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}
