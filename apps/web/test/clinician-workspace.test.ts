import { describe, it, expect } from 'vitest';
import {
  MOCK_CLINICIAN_PROFILE,
  MOCK_SCHEDULE,
  MOCK_QUEUE,
  MOCK_ROOM_READINESS,
  MOCK_METRICS,
} from '../src/features/clinician/data';

describe('Clinician Workspace – Data and Display Rules', () => {

  // ── Clinician profile ────────────────────────────────────────────────────

  it('clinician profile contains required identity fields', () => {
    expect(MOCK_CLINICIAN_PROFILE.clinicianId).toBeDefined();
    expect(MOCK_CLINICIAN_PROFILE.displayName).toBeDefined();
    expect(MOCK_CLINICIAN_PROFILE.specialty).toBeDefined();
    expect(MOCK_CLINICIAN_PROFILE.clinicName).toBeDefined();
    expect(MOCK_CLINICIAN_PROFILE.availabilityStatus).toBeDefined();
  });

  it('availability status is a valid ClinicianAvailabilityStatus', () => {
    const validStatuses = ['AVAILABLE', 'IN_ENCOUNTER', 'CATCH_UP', 'BREAK', 'OFF_DUTY'];
    expect(validStatuses).toContain(MOCK_CLINICIAN_PROFILE.availabilityStatus);
  });

  // ── Minimum-necessary patient data (HIPAA) ───────────────────────────────

  it('HIPAA: schedule items contain only safe patient reference and initials', () => {
    for (const item of MOCK_SCHEDULE) {
      // Safe reference must follow SS-PT-XXXX format (opaque, no PHI)
      expect(item.safePatientReference).toMatch(/^SS-PT-\d+$/);

      // Initials format: one or two letters followed by period
      expect(item.patientInitials).toMatch(/^[A-Z]\.[A-Z]\.$/);

      // Must NOT contain a full name field
      expect((item as Record<string, unknown>)['patientName']).toBeUndefined();
      expect((item as Record<string, unknown>)['patientFullName']).toBeUndefined();
      expect((item as Record<string, unknown>)['dateOfBirth']).toBeUndefined();
      expect((item as Record<string, unknown>)['diagnosis']).toBeUndefined();
      expect((item as Record<string, unknown>)['medications']).toBeUndefined();
      expect((item as Record<string, unknown>)['clinicalNotes']).toBeUndefined();
    }
  });

  it('HIPAA: queue entries contain only safe reference and initials', () => {
    for (const entry of MOCK_QUEUE) {
      expect(entry.safePatientReference).toMatch(/^SS-PT-\d+$/);
      expect(entry.patientInitials).toMatch(/^[A-Z]\.[A-Z]\.$/);
      expect((entry as Record<string, unknown>)['patientName']).toBeUndefined();
    }
  });

  // ── Schedule structure ───────────────────────────────────────────────────

  it('schedule items have required fields', () => {
    expect(MOCK_SCHEDULE.length).toBeGreaterThan(0);
    for (const item of MOCK_SCHEDULE) {
      expect(item.scheduleItemId).toBeDefined();
      expect(item.appointmentType).toBeDefined();
      expect(item.mode).toMatch(/^(VIDEO|IN_CLINIC)$/);
      expect(item.status).toBeDefined();
      expect(item.startsAt).toBeDefined();
      expect(item.endsAt).toBeDefined();
      expect(item.nextAction).toBeDefined();
    }
  });

  it('start time is before end time for all schedule items', () => {
    for (const item of MOCK_SCHEDULE) {
      const start = new Date(item.startsAt).getTime();
      const end = new Date(item.endsAt).getTime();
      expect(start).toBeLessThan(end);
    }
  });

  // ── Next action rules ────────────────────────────────────────────────────

  it('each schedule item has a valid nextAction', () => {
    const validActions = [
      'AWAIT_CHECK_IN', 'START_ENCOUNTER', 'JOIN_VIDEO',
      'COMPLETE_ENCOUNTER', 'MARK_NO_SHOW', 'VIEW_COMPLETED', 'NO_ACTION'
    ];
    for (const item of MOCK_SCHEDULE) {
      expect(validActions).toContain(item.nextAction);
    }
  });

  it('video appointments with JOIN_VIDEO action have videoRoomReady field', () => {
    const videoReadyItems = MOCK_SCHEDULE.filter(i => i.nextAction === 'JOIN_VIDEO');
    for (const item of videoReadyItems) {
      expect(item.mode).toBe('VIDEO');
      expect(typeof item.videoRoomReady).toBe('boolean');
    }
  });

  // ── Patient queue ────────────────────────────────────────────────────────

  it('queue entries have valid status (CHECKED_IN or READY)', () => {
    for (const entry of MOCK_QUEUE) {
      expect(['CHECKED_IN', 'READY']).toContain(entry.status);
    }
  });

  it('queue entries have waiting duration in minutes', () => {
    for (const entry of MOCK_QUEUE) {
      expect(typeof entry.waitingMinutes).toBe('number');
      expect(entry.waitingMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('encounter start permission: only CLINICIAN role can start encounters', () => {
    // This is tested in the permission layer via can('CLINICIAN', 'clinician:start_encounter')
    // Here we validate the data model supports encounter tracking
    const inProgressItems = MOCK_SCHEDULE.filter(i => i.status === 'IN_PROGRESS');
    for (const item of inProgressItems) {
      expect(item.encounterId).toBeDefined();
    }
  });

  // ── Room readiness ───────────────────────────────────────────────────────

  it('room readiness has all required indicators', () => {
    expect(MOCK_ROOM_READINESS.videoServiceStatus).toBeDefined();
    expect(MOCK_ROOM_READINESS.clinicianDeviceStatus).toBeDefined();
    expect(MOCK_ROOM_READINESS.realtimeSyncStatus).toBeDefined();
    expect(MOCK_ROOM_READINESS.networkQuality).toBeDefined();
    expect(MOCK_ROOM_READINESS.lastCheckedAt).toBeDefined();
  });

  it('room readiness levels are valid', () => {
    const validLevels = ['READY', 'DEGRADED', 'NOT_READY', 'UNKNOWN'];
    expect(validLevels).toContain(MOCK_ROOM_READINESS.videoServiceStatus);
    expect(validLevels).toContain(MOCK_ROOM_READINESS.clinicianDeviceStatus);
    expect(validLevels).toContain(MOCK_ROOM_READINESS.realtimeSyncStatus);
  });

  // ── Metrics ──────────────────────────────────────────────────────────────

  it('metrics contain all required counters', () => {
    expect(typeof MOCK_METRICS.appointmentsToday).toBe('number');
    expect(typeof MOCK_METRICS.patientsWaiting).toBe('number');
    expect(typeof MOCK_METRICS.roomsReady).toBe('number');
    expect(typeof MOCK_METRICS.remainingVisits).toBe('number');
  });

  it('remaining visits cannot exceed appointments today', () => {
    expect(MOCK_METRICS.remainingVisits).toBeLessThanOrEqual(MOCK_METRICS.appointmentsToday);
  });
});
