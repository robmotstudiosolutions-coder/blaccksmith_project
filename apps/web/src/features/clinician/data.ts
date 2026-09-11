/**
 * Clinician feature data layer.
 *
 * HIPAA minimum-necessary data rules:
 * - Patient identity in list and queue views is limited to safe references
 *   (e.g. "SS-PT-4821") and initials (e.g. "J.D.").
 * - Full names, dates of birth, diagnoses, medications, and clinical notes
 *   are excluded from this workspace.
 * - Deep clinical documentation remains in the EHR system.
 */

// ── Visit mode ────────────────────────────────────────────────────────────────

export type VisitMode = 'VIDEO' | 'IN_CLINIC';

// ── Appointment status ────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

// ── Encounter ─────────────────────────────────────────────────────────────────

export type EncounterStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

// ── Room readiness ────────────────────────────────────────────────────────────

export type ReadinessLevel = 'READY' | 'DEGRADED' | 'NOT_READY' | 'UNKNOWN';

export interface RoomReadiness {
  videoServiceStatus: ReadinessLevel;
  clinicianDeviceStatus: ReadinessLevel;
  realtimeSyncStatus: ReadinessLevel;
  networkQuality: 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
  lastCheckedAt: string;
}

// ── Clinician identity ────────────────────────────────────────────────────────

export type ClinicianAvailabilityStatus =
  | 'AVAILABLE'
  | 'IN_ENCOUNTER'
  | 'CATCH_UP'
  | 'BREAK'
  | 'OFF_DUTY';

export interface ClinicianProfile {
  clinicianId: string;
  displayName: string;
  title: string;
  specialty: string;
  clinicId: string;
  clinicName: string;
  availabilityStatus: ClinicianAvailabilityStatus;
  shiftStartsAt: string;
  shiftEndsAt: string;
}

// ── Schedule item ─────────────────────────────────────────────────────────────

/**
 * One item in the clinician's today schedule.
 * Patient identity is restricted to safe reference and initials only.
 */
export interface ScheduleItem {
  scheduleItemId: string;
  /** Server-generated opaque safe reference. Never contains PHI. */
  safePatientReference: string;
  /** Two-character initials only (e.g. "J.D."). Never a full name. */
  patientInitials: string;
  appointmentType: string;
  mode: VisitMode;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  /** How many minutes the patient has been waiting (undefined if not checked in). */
  waitingMinutes?: number;
  /** The next action the clinician should take for this appointment. */
  nextAction: ClinicianNextAction;
  encounterId?: string;
  /** Whether video room is confirmed ready for this appointment. */
  videoRoomReady?: boolean;
}

// ── Patient queue entry ───────────────────────────────────────────────────────

export interface QueueEntry {
  queueId: string;
  safePatientReference: string;
  patientInitials: string;
  appointmentType: string;
  mode: VisitMode;
  status: 'CHECKED_IN' | 'READY';
  checkedInAt: string;
  waitingMinutes: number;
  scheduleItemId: string;
}

// ── Next action ───────────────────────────────────────────────────────────────

export type ClinicianNextAction =
  | 'AWAIT_CHECK_IN'
  | 'START_ENCOUNTER'
  | 'JOIN_VIDEO'
  | 'COMPLETE_ENCOUNTER'
  | 'MARK_NO_SHOW'
  | 'VIEW_COMPLETED'
  | 'NO_ACTION';

// ── Clinician workspace metrics ───────────────────────────────────────────────

export interface ClinicianMetrics {
  appointmentsToday: number;
  patientsWaiting: number;
  roomsReady: number;
  remainingVisits: number;
}

// ── Deterministic mock data (zero real PHI) ───────────────────────────────────

const NOW = new Date();
const at = (offsetMinutes: number) =>
  new Date(NOW.getTime() + offsetMinutes * 60_000).toISOString();

export const MOCK_CLINICIAN_PROFILE: ClinicianProfile = {
  clinicianId: '00000000-0000-4000-8000-000000000301',
  displayName: 'Dr. Sarah Adebayo',
  title: 'Consultant Cardiologist',
  specialty: 'Cardiology',
  clinicId: '00000000-0000-4000-8000-000000000101',
  clinicName: 'Cardiology Clinic — Main Hospital',
  availabilityStatus: 'AVAILABLE',
  shiftStartsAt: at(-120),
  shiftEndsAt: at(300),
};

export const MOCK_SCHEDULE: ScheduleItem[] = [
  {
    scheduleItemId: 'si-001',
    safePatientReference: 'SS-PT-4821',
    patientInitials: 'J.D.',
    appointmentType: 'Initial cardiology consultation',
    mode: 'IN_CLINIC',
    status: 'IN_PROGRESS',
    startsAt: at(-10),
    endsAt: at(20),
    waitingMinutes: 10,
    nextAction: 'COMPLETE_ENCOUNTER',
    encounterId: 'enc-001',
  },
  {
    scheduleItemId: 'si-002',
    safePatientReference: 'SS-PT-5139',
    patientInitials: 'M.S.',
    appointmentType: 'Cardiology follow-up',
    mode: 'VIDEO',
    status: 'CHECKED_IN',
    startsAt: at(25),
    endsAt: at(55),
    waitingMinutes: 5,
    nextAction: 'JOIN_VIDEO',
    videoRoomReady: true,
  },
  {
    scheduleItemId: 'si-003',
    safePatientReference: 'SS-PT-6742',
    patientInitials: 'A.K.',
    appointmentType: 'ECG review',
    mode: 'IN_CLINIC',
    status: 'SCHEDULED',
    startsAt: at(60),
    endsAt: at(90),
    nextAction: 'AWAIT_CHECK_IN',
  },
  {
    scheduleItemId: 'si-004',
    safePatientReference: 'SS-PT-3387',
    patientInitials: 'R.B.',
    appointmentType: 'Initial cardiology consultation',
    mode: 'VIDEO',
    status: 'SCHEDULED',
    startsAt: at(100),
    endsAt: at(130),
    nextAction: 'AWAIT_CHECK_IN',
    videoRoomReady: false,
  },
  {
    scheduleItemId: 'si-005',
    safePatientReference: 'SS-PT-7201',
    patientInitials: 'L.T.',
    appointmentType: 'Cardiology follow-up',
    mode: 'IN_CLINIC',
    status: 'COMPLETED',
    startsAt: at(-90),
    endsAt: at(-60),
    nextAction: 'VIEW_COMPLETED',
    encounterId: 'enc-005',
  },
];

export const MOCK_QUEUE: QueueEntry[] = [
  {
    queueId: 'q-001',
    safePatientReference: 'SS-PT-4821',
    patientInitials: 'J.D.',
    appointmentType: 'Initial cardiology consultation',
    mode: 'IN_CLINIC',
    status: 'READY',
    checkedInAt: at(-15),
    waitingMinutes: 15,
    scheduleItemId: 'si-001',
  },
  {
    queueId: 'q-002',
    safePatientReference: 'SS-PT-5139',
    patientInitials: 'M.S.',
    appointmentType: 'Cardiology follow-up',
    mode: 'VIDEO',
    status: 'CHECKED_IN',
    checkedInAt: at(-5),
    waitingMinutes: 5,
    scheduleItemId: 'si-002',
  },
];

export const MOCK_ROOM_READINESS: RoomReadiness = {
  videoServiceStatus: 'READY',
  clinicianDeviceStatus: 'READY',
  realtimeSyncStatus: 'READY',
  networkQuality: 'GOOD',
  lastCheckedAt: new Date().toISOString(),
};

export const MOCK_METRICS: ClinicianMetrics = {
  appointmentsToday: 8,
  patientsWaiting: 2,
  roomsReady: 1,
  remainingVisits: 3,
};
