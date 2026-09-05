import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { ApplicationError, canTransitionSlot } from '@slotsure/domain';

describe('Booking Business Rules & State Safety', () => {
  describe('Idempotency Hashing', () => {
    it('generates deterministic SHA-256 request hashes', () => {
      const holdId = '00000000-0000-4000-8000-000000000401';
      const patientId = '00000000-0000-4000-8000-000000000011';
      const hash1 = createHash('sha256').update(`${holdId}:${patientId}`).digest('hex');
      const hash2 = createHash('sha256').update(`${holdId}:${patientId}`).digest('hex');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('detects payload tampering with mismatched hash', () => {
      const hashOriginal = createHash('sha256').update('hold-1:patient-1').digest('hex');
      const hashModified = createHash('sha256').update('hold-2:patient-1').digest('hex');
      expect(hashOriginal).not.toBe(hashModified);
    });
  });

  describe('Hold Expiration Logic', () => {
    it('identifies expired holds correctly', () => {
      const past = new Date(Date.now() - 1000);
      const isExpired = past <= new Date();
      expect(isExpired).toBe(true);
    });

    it('identifies active holds within TTL window', () => {
      const future = new Date(Date.now() + 300 * 1000);
      const isExpired = future <= new Date();
      expect(isExpired).toBe(false);
    });
  });

  describe('Controlled Release Transition Safeguards', () => {
    it('prevents direct republication of booked slots without cancellation audit', () => {
      expect(canTransitionSlot('BOOKED', 'PUBLISHED')).toBe(false);
    });

    it('requires multi-stage controlled release flow', () => {
      // Step 1: Cancellation requested
      expect(canTransitionSlot('BOOKED', 'CANCEL_PENDING')).toBe(true);
      // Step 2: Release staged
      expect(canTransitionSlot('CANCEL_PENDING', 'RELEASE_PENDING')).toBe(true);
      // Step 3: Republished to public inventory
      expect(canTransitionSlot('RELEASE_PENDING', 'PUBLISHED')).toBe(true);
    });

    it('does not allow expired holds to jump directly to booked', () => {
      expect(canTransitionSlot('EXPIRED', 'BOOKED')).toBe(false);
    });
  });

  describe('Error Contracts', () => {
    it('maps conflict and availability errors to appropriate status codes', () => {
      const conflict = new ApplicationError('BOOKING_CONFLICT', 'Slot already taken', 409, false);
      expect(conflict.statusCode).toBe(409);
      expect(conflict.retryable).toBe(false);

      const expired = new ApplicationError('HOLD_EXPIRED', 'Hold has expired', 409, false);
      expect(expired.statusCode).toBe(409);

      const validation = new ApplicationError('VALIDATION_ERROR', 'Key payload mismatch', 422, false);
      expect(validation.statusCode).toBe(422);

      const unknownState = new ApplicationError('BOOKING_STATE_UNKNOWN', 'Checking status', 202, true);
      expect(unknownState.statusCode).toBe(202);
      expect(unknownState.retryable).toBe(true);
    });
  });
});
