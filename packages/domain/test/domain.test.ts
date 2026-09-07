import { describe, it, expect } from 'vitest';
import {
  canTransitionSlot,
  ApplicationError,
  slotStates,
  userRoles,
  holdStatuses,
  bookingStatuses
} from '../src/index.js';

describe('Domain Package - Core Domain Logic & State Machine', () => {
  it('validates role and state taxonomies', () => {
    expect(userRoles).toContain('PATIENT');
    expect(userRoles).toContain('BOOKING_STAFF');
    expect(userRoles).toContain('CLINIC_ADMIN');
    expect(slotStates).toContain('PUBLISHED');
    expect(slotStates).toContain('HELD');
    expect(slotStates).toContain('BOOKED');
    expect(holdStatuses).toContain('ACTIVE');
    expect(bookingStatuses).toContain('CONFIRMED');
  });

  it('enforces valid slot lifecycle transitions', () => {
    // Normal booking path
    expect(canTransitionSlot('PUBLISHED', 'HELD')).toBe(true);
    expect(canTransitionSlot('HELD', 'BOOKED')).toBe(true);
    expect(canTransitionSlot('BOOKED', 'CANCEL_PENDING')).toBe(true);
    expect(canTransitionSlot('CANCEL_PENDING', 'RELEASE_PENDING')).toBe(true);
    expect(canTransitionSlot('RELEASE_PENDING', 'PUBLISHED')).toBe(true);

    // Forbidden jumps
    expect(canTransitionSlot('PUBLISHED', 'BOOKED')).toBe(false);
    expect(canTransitionSlot('BOOKED', 'PUBLISHED')).toBe(false);
    expect(canTransitionSlot('CANCEL_PENDING', 'PUBLISHED')).toBe(false);
  });

  it('constructs typed ApplicationError instances with proper metadata', () => {
    const error = new ApplicationError('BOOKING_CONFLICT', 'Slot unavailable', 409, false, {
      slotId: 'slot-1'
    });
    expect(error.name).toBe('ApplicationError');
    expect(error.code).toBe('BOOKING_CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.retryable).toBe(false);
    expect(error.details).toEqual({ slotId: 'slot-1' });
  });
});
