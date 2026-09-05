import { describe, it, expect } from 'vitest';
import { canTransitionSlot, ApplicationError, slotStates, userRoles } from '@slotsure/domain';

describe('Domain - Slot State Machine', () => {
  it('allows valid transitions from PUBLISHED', () => {
    expect(canTransitionSlot('PUBLISHED', 'HELD')).toBe(true);
    expect(canTransitionSlot('PUBLISHED', 'BLOCKED')).toBe(true);
    expect(canTransitionSlot('PUBLISHED', 'ERROR')).toBe(true);
  });

  it('rejects invalid direct booking from PUBLISHED without a hold', () => {
    expect(canTransitionSlot('PUBLISHED', 'BOOKED')).toBe(false);
    expect(canTransitionSlot('PUBLISHED', 'RELEASE_PENDING')).toBe(false);
  });

  it('allows valid transitions from HELD', () => {
    expect(canTransitionSlot('HELD', 'BOOKED')).toBe(true);
    expect(canTransitionSlot('HELD', 'EXPIRED')).toBe(true);
    expect(canTransitionSlot('HELD', 'PUBLISHED')).toBe(true);
  });

  it('allows cancellation transition from BOOKED to CANCEL_PENDING', () => {
    expect(canTransitionSlot('BOOKED', 'CANCEL_PENDING')).toBe(true);
    expect(canTransitionSlot('BOOKED', 'PUBLISHED')).toBe(false); // cannot jump back to published directly
  });

  it('enforces controlled release lifecycle: CANCEL_PENDING -> RELEASE_PENDING -> PUBLISHED', () => {
    expect(canTransitionSlot('CANCEL_PENDING', 'RELEASE_PENDING')).toBe(true);
    expect(canTransitionSlot('CANCEL_PENDING', 'PUBLISHED')).toBe(false);
    expect(canTransitionSlot('RELEASE_PENDING', 'PUBLISHED')).toBe(true);
  });

  it('contains expected core roles and states', () => {
    expect(userRoles).toContain('PATIENT');
    expect(userRoles).toContain('BOOKING_STAFF');
    expect(slotStates).toContain('PUBLISHED');
    expect(slotStates).toContain('HELD');
    expect(slotStates).toContain('BOOKED');
  });
});

describe('Domain - ApplicationError', () => {
  it('constructs an error with code, statusCode, and retryability', () => {
    const error = new ApplicationError('BOOKING_CONFLICT', 'That slot was just taken.', 409, false, { slotId: '123' });
    expect(error.code).toBe('BOOKING_CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.retryable).toBe(false);
    expect(error.details).toEqual({ slotId: '123' });
    expect(error.message).toBe('That slot was just taken.');
    expect(error.name).toBe('ApplicationError');
  });
});
