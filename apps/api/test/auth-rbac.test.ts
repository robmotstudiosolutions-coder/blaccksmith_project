import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, hashToken, SessionAuthProvider, DevelopmentAuthProvider } from '../src/auth.js';
import { ApplicationError } from '../../../packages/domain/dist/index.js';
import { buildApp } from '../src/app.js';

describe('Auth & Cryptographic Integrity', () => {
  it('correctly hashes and verifies passwords with random salt', () => {
    const password = 'StrongHospitalPassword123!';
    const hashed = hashPassword(password);

    expect(hashed).toContain(':');
    expect(verifyPassword(password, hashed)).toBe(true);
    expect(verifyPassword('WrongPassword', hashed)).toBe(false);
  });

  it('generates consistent sha256 hashes for session tokens', () => {
    const token = 'session-token-12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('authenticates user from active session token', async () => {
    const mockSql: any = vi.fn().mockImplementation(async () => [
      {
        userId: '00000000-0000-4000-8000-000000000001',
        role: 'PATIENT',
        identityReference: 'REF-PATIENT-1',
        email: 'patient@slotsure.internal',
        displayName: 'Jane Doe',
        expiresAt: new Date(Date.now() + 3600000)
      }
    ]);

    const provider = new SessionAuthProvider(mockSql);
    const mockReq: any = {
      headers: {
        authorization: 'Bearer valid-test-token'
      }
    };

    const user = await provider.authenticate(mockReq);
    expect(user.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(user.role).toBe('PATIENT');
    expect(user.displayName).toBe('Jane Doe');
  });

  it('rejects expired or non-existent session token with SESSION_EXPIRED', async () => {
    const mockSql: any = vi.fn().mockImplementation(async () => []);

    const provider = new SessionAuthProvider(mockSql);
    const mockReq: any = {
      headers: {
        authorization: 'Bearer expired-or-invalid-token'
      }
    };

    await expect(provider.authenticate(mockReq)).rejects.toThrow(
      new ApplicationError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.', 401)
    );
  });
});

describe('RBAC (Role-Based Access Control) Policy Enforcement', () => {
  const mockBookingService: any = {
    getClinics: vi.fn().mockResolvedValue([]),
    getClinicians: vi.fn().mockResolvedValue([]),
    getAppointmentTypes: vi.fn().mockResolvedValue([]),
    availability: vi.fn().mockResolvedValue([]),
    getStaffMetrics: vi.fn().mockResolvedValue([{ label: 'Active holds', value: '0', note: 'live' }]),
    getReconciliationQueue: vi.fn().mockResolvedValue([]),
    getAuditEvents: vi.fn().mockResolvedValue([]),
    releaseCancelledSlot: vi.fn().mockResolvedValue(undefined),
    publishSlots: vi.fn().mockResolvedValue({ publishedCount: 1, slotIds: ['s1'] })
  };

  const app = buildApp(
    { LOG_LEVEL: 'silent' },
    mockBookingService,
    new DevelopmentAuthProvider()
  );

  it('denies patients from accessing staff metrics with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/staff/metrics',
      headers: { 'x-user-role': 'PATIENT' }
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('FORBIDDEN');
  });

  it('denies patients from publishing slot capacity with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/staff/slots/publish',
      headers: { 'x-user-role': 'PATIENT' },
      payload: {
        slots: [
          {
            clinicId: '00000000-0000-4000-8000-000000000001',
            appointmentTypeId: '00000000-0000-4000-8000-000000000002',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        ]
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows CLINIC_ADMIN to publish slots', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/staff/slots/publish',
      headers: { 'x-user-role': 'CLINIC_ADMIN' },
      payload: {
        slots: [
          {
            clinicId: '00000000-0000-4000-8000-000000000001',
            appointmentTypeId: '00000000-0000-4000-8000-000000000002',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        ]
      }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().publishedCount).toBe(1);
  });

  it('allows BOOKING_STAFF to access reconciliation queue', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/staff/reconciliation',
      headers: { 'x-user-role': 'BOOKING_STAFF' }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toBeDefined();
  });
});
