import { describe, it, expect, vi } from 'vitest';
import { TelehealthService, VideoTokenProvider } from '../src/telehealth-service.js';
import { ApplicationError } from '../../../packages/domain/dist/index.js';

class MockTokenProvider implements VideoTokenProvider {
  async createToken(roomName: string, participantId: string, participantName: string, isClinician: boolean): Promise<string> {
    return `mock-jwt-token-for-${participantId}`;
  }
}

describe('TelehealthService & Consultation Time Window Guard', () => {
  const mockTokenProvider = new MockTokenProvider();

  it('rejects participant if appointment does not exist', async () => {
    const mockSql: any = vi.fn().mockImplementation(async () => []);
    const service = new TelehealthService(mockSql, mockTokenProvider);

    await expect(service.getSessionToken('missing-id', 'user-1', 'PATIENT')).rejects.toThrow(
      new ApplicationError('SLOT_NOT_FOUND', 'The requested appointment could not be found.', 404)
    );
  });

  it('rejects unauthorized user who is neither the patient nor the clinician', async () => {
    const now = new Date();
    const mockSql: any = vi.fn().mockImplementation(async () => [
      {
        bookingId: 'booking-1',
        patientId: 'patient-abc',
        clinicianId: 'clinician-xyz',
        startTime: new Date(now.getTime() - 2 * 60 * 1000), // 2 mins ago
        endTime: new Date(now.getTime() + 20 * 60 * 1000), // in 20 mins
        status: 'CONFIRMED',
        mode: 'VIDEO'
      }
    ]);

    const service = new TelehealthService(mockSql, mockTokenProvider);

    await expect(service.getSessionToken('booking-1', 'intruder-user', 'PATIENT')).rejects.toThrow(
      new ApplicationError('TELEHEALTH_UNAUTHORIZED', 'You are not authorized to join this consultation room.', 403)
    );
  });

  it('rejects access if appointment is an IN_PERSON appointment', async () => {
    const now = new Date();
    const mockSql: any = vi.fn().mockImplementation(async () => [
      {
        bookingId: 'booking-1',
        patientId: 'patient-abc',
        clinicianId: 'clinician-xyz',
        startTime: new Date(now.getTime() - 2 * 60 * 1000),
        endTime: new Date(now.getTime() + 20 * 60 * 1000),
        status: 'CONFIRMED',
        mode: 'IN_PERSON'
      }
    ]);

    const service = new TelehealthService(mockSql, mockTokenProvider);

    await expect(service.getSessionToken('booking-1', 'patient-abc', 'PATIENT')).rejects.toThrow(
      new ApplicationError('VALIDATION_ERROR', 'This appointment is scheduled as an in-person consultation.', 400)
    );
  });

  it('rejects access if patient joins too early (> 10 minutes before start)', async () => {
    const now = new Date();
    // Appointment starts 30 minutes in the future
    const startTime = new Date(now.getTime() + 30 * 60 * 1000);
    const endTime = new Date(now.getTime() + 60 * 60 * 1000);

    const mockSql: any = vi.fn().mockImplementation(async () => [
      {
        bookingId: 'booking-1',
        patientId: 'patient-abc',
        clinicianId: 'clinician-xyz',
        startTime,
        endTime,
        status: 'CONFIRMED',
        mode: 'VIDEO'
      }
    ]);

    const service = new TelehealthService(mockSql, mockTokenProvider);

    try {
      await service.getSessionToken('booking-1', 'patient-abc', 'PATIENT');
      expect.unreachable('Should have thrown TELEHEALTH_TOO_EARLY');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApplicationError);
      expect(err.code).toBe('TELEHEALTH_TOO_EARLY');
      expect(err.statusCode).toBe(403);
      expect(err.details?.opensAt).toBeDefined();
    }
  });

  it('rejects access if appointment session has expired (> 15 minutes after end)', async () => {
    const now = new Date();
    // Appointment ended 20 minutes ago
    const startTime = new Date(now.getTime() - 50 * 60 * 1000);
    const endTime = new Date(now.getTime() - 20 * 60 * 1000);

    const mockSql: any = vi.fn().mockImplementation(async () => [
      {
        bookingId: 'booking-1',
        patientId: 'patient-abc',
        clinicianId: 'clinician-xyz',
        startTime,
        endTime,
        status: 'CONFIRMED',
        mode: 'VIDEO'
      }
    ]);

    const service = new TelehealthService(mockSql, mockTokenProvider);

    await expect(service.getSessionToken('booking-1', 'patient-abc', 'PATIENT')).rejects.toThrow(
      new ApplicationError(
        'TELEHEALTH_EXPIRED',
        'This consultation window has concluded. Please contact your clinic if you missed your visit.',
        403,
        false
      )
    );
  });

  it('authorizes patient and clinician within window [startsAt - 10m, endsAt + 15m] and emits audit event', async () => {
    const now = new Date();
    // Appointment starts in 5 minutes (within 10m early window)
    const startTime = new Date(now.getTime() + 5 * 60 * 1000);
    const endTime = new Date(now.getTime() + 35 * 60 * 1000);

    let auditLogged = false;
    const mockSql: any = vi.fn().mockImplementation(async (strings: TemplateStringsArray) => {
      const text = strings.join('');
      if (text.includes('bookings.patient_id as "patientId"')) {
        return [
          {
            bookingId: 'booking-1',
            patientId: 'patient-abc',
            patientName: 'Jane Doe',
            clinicianId: 'clinician-xyz',
            clinicianName: 'Dr. Sarah Connor',
            startTime,
            endTime,
            status: 'CONFIRMED',
            mode: 'VIDEO'
          }
        ];
      }
      if (text.includes('insert into audit_events')) {
        auditLogged = true;
        return [];
      }
      return [];
    });

    const service = new TelehealthService(mockSql, mockTokenProvider);

    const tokenResponse = await service.getSessionToken('booking-1', 'patient-abc', 'PATIENT');

    expect(tokenResponse.token).toBe('mock-jwt-token-for-patient-abc');
    expect(tokenResponse.roomName).toBe('slotsure-room-booking-1');
    expect(tokenResponse.role).toBe('PATIENT');
    expect(auditLogged).toBe(true);
  });
});
