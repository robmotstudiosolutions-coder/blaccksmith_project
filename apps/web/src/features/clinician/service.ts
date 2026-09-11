/**
 * Clinician feature service layer.
 *
 * All fetch calls go through the authoritative API proxy.
 * The mock fallback returns deterministic data matching the typed contracts.
 *
 * HIPAA minimum-necessary:
 * - Schedule and queue responses return safe references and initials only.
 * - Clinical notes, diagnoses, medications, and full patient demographics
 *   are not fetched or stored in this workspace.
 */

import type {
  ClinicianProfile,
  ClinicianMetrics,
  QueueEntry,
  RoomReadiness,
  ScheduleItem,
  ClinicianAvailabilityStatus,
} from './data';

import {
  MOCK_CLINICIAN_PROFILE,
  MOCK_METRICS,
  MOCK_QUEUE,
  MOCK_ROOM_READINESS,
  MOCK_SCHEDULE,
} from './data';

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/booking/${path}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new Error('Service unavailable');
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/booking/${path}`, {
      method: 'POST',
      cache: 'no-store',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Service unavailable');
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getClinicianProfile(clinicianId: string): Promise<ClinicianProfile> {
  try {
    const data = await apiGet<{ clinician: ClinicianProfile }>(`clinicians/${clinicianId}/profile`);
    return data.clinician;
  } catch {
    return MOCK_CLINICIAN_PROFILE;
  }
}

export async function getClinicianSchedule(clinicianId: string): Promise<ScheduleItem[]> {
  try {
    const data = await apiGet<{ schedule: ScheduleItem[] }>(`clinicians/${clinicianId}/schedule`);
    return data.schedule;
  } catch {
    return MOCK_SCHEDULE;
  }
}

export async function getClinicianQueue(clinicianId: string): Promise<QueueEntry[]> {
  try {
    const data = await apiGet<{ queue: QueueEntry[] }>(`clinicians/${clinicianId}/queue`);
    return data.queue;
  } catch {
    return MOCK_QUEUE;
  }
}

export async function getClinicianMetrics(clinicianId: string): Promise<ClinicianMetrics> {
  try {
    const data = await apiGet<{ metrics: ClinicianMetrics }>(`clinicians/${clinicianId}/metrics`);
    return data.metrics;
  } catch {
    return MOCK_METRICS;
  }
}

export async function getRoomReadiness(clinicianId: string): Promise<RoomReadiness> {
  try {
    const data = await apiGet<{ readiness: RoomReadiness }>(`clinicians/${clinicianId}/readiness`);
    return data.readiness;
  } catch {
    return MOCK_ROOM_READINESS;
  }
}

export async function startEncounter(scheduleItemId: string): Promise<{ encounterId: string }> {
  try {
    return await apiPost<{ encounterId: string }>(`schedule-items/${scheduleItemId}/start-encounter`);
  } catch {
    // Mock fallback: generate a deterministic encounter ID
    return { encounterId: `enc-${scheduleItemId.slice(-6)}` };
  }
}

export async function markAttendance(
  scheduleItemId: string,
  attended: boolean,
): Promise<void> {
  try {
    await apiPost(`schedule-items/${scheduleItemId}/attendance`, { attended });
  } catch {
    // Silent mock fallback
  }
}

export async function updateAvailabilityStatus(
  clinicianId: string,
  status: ClinicianAvailabilityStatus,
): Promise<void> {
  try {
    await apiPost(`clinicians/${clinicianId}/availability`, { status });
  } catch {
    // Silent mock fallback
  }
}
