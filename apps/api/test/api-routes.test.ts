import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { BookingService } from '../src/booking-service.js';
import { DevelopmentAuthProvider } from '../src/auth.js';

describe('Fastify API Routes Integration (app.inject)', () => {
  let mockService: Partial<BookingService>;
  let app: ReturnType<typeof buildApp>;

  const demoClinicId = '00000000-0000-4000-8000-000000000101';
  const demoTypeId = '00000000-0000-4000-8000-000000000201';
  const demoSlotId = '00000000-0000-4000-8000-000000000401';
  const demoHoldId = '00000000-0000-4000-8000-000000000501';
  const demoBookingId = '00000000-0000-4000-8000-000000000601';

  beforeEach(() => {
    mockService = {
      availability: vi.fn().mockResolvedValue([
        {
          slotId: demoSlotId,
          clinicId: demoClinicId,
          clinicName: 'Cardiology Clinic',
          appointmentTypeId: demoTypeId,
          appointmentType: 'Initial consultation',
          clinicianId: null,
          clinicianName: null,
          startsAt: '2026-09-06T09:00:00.000Z',
          endsAt: '2026-09-06T09:30:00.000Z',
          version: 1,
          state: 'PUBLISHED'
        }
      ]),
      getClinics: vi.fn().mockResolvedValue([
        { id: demoClinicId, name: 'Cardiology Clinic', hospitalName: 'Main Hospital', locationReference: 'CARD-1' }
      ]),
      getAppointmentTypes: vi.fn().mockResolvedValue([
        { id: demoTypeId, clinicId: demoClinicId, name: 'Initial consultation', durationMinutes: 30 }
      ]),
      createHold: vi.fn().mockResolvedValue({
        holdId: demoHoldId,
        slotId: demoSlotId,
        expiresAt: '2026-09-06T09:05:00.000Z',
        state: 'HELD'
      }),
      commitHold: vi.fn().mockResolvedValue({
        bookingId: demoBookingId,
        status: 'CONFIRMED',
        slotId: demoSlotId,
        correlationId: 'SS-TEST-99887'
      }),
      cancelBooking: vi.fn().mockResolvedValue({
        bookingId: demoBookingId,
        status: 'CANCEL_PENDING',
        slotId: demoSlotId,
        correlationId: 'SS-CANCEL-99887'
      }),
      alternatives: vi.fn().mockResolvedValue([]),
      attempt: vi.fn().mockResolvedValue(undefined),
      getStaffMetrics: vi.fn().mockResolvedValue([
        { label: 'Today’s confirmed bookings', value: '12', note: 'Active' }
      ]),
      getReconciliationQueue: vi.fn().mockResolvedValue([
        { id: 'rec-1', slotId: demoSlotId, safeReference: 'REC-001', category: 'Cancellation', ageMinutes: 5, nextSafeAction: 'Release' }
      ]),
      getAuditEvents: vi.fn().mockResolvedValue([
        { id: 'aud-1', action: 'HOLD_CREATED', targetType: 'HOLD', targetId: demoHoldId, outcome: 'SUCCESS', correlationId: 'corr-1', occurredAt: '2026-09-05T20:00:00.000Z' }
      ]),
      releaseCancelledSlot: vi.fn().mockResolvedValue(undefined)
    };

    app = buildApp(
      { LOG_LEVEL: 'silent' },
      mockService as BookingService,
      new DevelopmentAuthProvider()
    );
  });

  describe('Health & Security Headers', () => {
    it('returns 200 with service info on /healthz', async () => {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok', service: 'slotsure-api' });
    });

    it('injects mandatory security headers and correlation ID', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('Catalog Endpoints', () => {
    it('returns clinics list on /v1/clinics', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/clinics' });
      expect(res.statusCode).toBe(200);
      expect(res.json().clinics).toHaveLength(1);
      expect(res.json().clinics[0].name).toBe('Cardiology Clinic');
    });

    it('returns appointment types on /v1/appointment-types', async () => {
      const res = await app.inject({ method: 'GET', url: `/v1/appointment-types?clinicId=${demoClinicId}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().appointmentTypes).toHaveLength(1);
    });
  });

  describe('Availability & Validation', () => {
    it('rejects /v1/availability when query params are missing', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/availability' });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns slots on /v1/availability with valid clinic and type', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/availability?clinicId=${demoClinicId}&appointmentTypeId=${demoTypeId}`
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().authoritative).toBe(true);
      expect(res.json().slots).toHaveLength(1);
    });
  });

  describe('Holds, Commits & Cancellations', () => {
    it('rejects /v1/holds without idempotency key header', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/holds',
        payload: { slotId: demoSlotId }
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('creates hold with valid idempotency key and slotId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/holds',
        headers: { 'idempotency-key': 'test-idempotency-key-01' },
        payload: { slotId: demoSlotId }
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().holdId).toBe(demoHoldId);
      expect(res.json().state).toBe('HELD');
    });

    it('commits hold on /v1/holds/:holdId/commit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/holds/${demoHoldId}/commit`,
        headers: { 'idempotency-key': 'test-commit-key-01' }
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('CONFIRMED');
      expect(res.json().bookingId).toBe(demoBookingId);
    });

    it('cancels booking on /v1/bookings/:bookingId/cancel', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${demoBookingId}/cancel`,
        headers: { 'idempotency-key': 'test-cancel-key-01' }
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('CANCEL_PENDING');
    });
  });

  describe('Staff Operations & Audit Log', () => {
    it('returns metrics on /v1/staff/metrics', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/staff/metrics' });
      expect(res.statusCode).toBe(200);
      expect(res.json().metrics).toHaveLength(1);
    });

    it('returns reconciliation items on /v1/staff/reconciliation', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/staff/reconciliation' });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('returns audit events on /v1/staff/audit', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/staff/audit?limit=10' });
      expect(res.statusCode).toBe(200);
      expect(res.json().events).toHaveLength(1);
      expect(res.json().events[0].action).toBe('HOLD_CREATED');
    });

    it('releases cancelled slot on /v1/staff/slots/:id/release', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/staff/slots/${demoSlotId}/release`
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, slotId: demoSlotId, state: 'PUBLISHED' });
    });
  });
});
