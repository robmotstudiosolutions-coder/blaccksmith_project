import { describe, it, expect } from 'vitest';
import { defaultBookingContext } from '../src/lib/api/booking-client';

describe('BookingClient context & configurations', () => {
  it('defines default clinic and appointment type contexts', () => {
    expect(defaultBookingContext.clinicId).toBeDefined();
    expect(defaultBookingContext.appointmentTypeId).toBeDefined();
    expect(typeof defaultBookingContext.clinicId).toBe('string');
  });

  it('provides well-formed UUID format for default context identifiers', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(defaultBookingContext.clinicId)).toBe(true);
    expect(uuidRegex.test(defaultBookingContext.appointmentTypeId)).toBe(true);
  });
});
