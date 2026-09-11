/**
 * Centralized permission helper.
 *
 * Frontend permission checks are display-layer guards only.
 * The server enforces the same policy independently.
 * Client-side checks must never be the sole authorization mechanism.
 */

import type { AppRole } from '@/types/booking';

// ── Action & Resource vocabulary ──────────────────────────────────────────────

export type PermissionAction =
  // Booking
  | 'booking:search'
  | 'booking:hold'
  | 'booking:commit'
  | 'booking:cancel'
  | 'booking:reschedule'
  | 'booking:view_own'
  | 'booking:view_any'
  | 'booking:staff_assist'
  // Clinician
  | 'clinician:view_schedule'
  | 'clinician:view_queue'
  | 'clinician:start_encounter'
  | 'clinician:mark_attendance'
  | 'clinician:view_room_readiness'
  // Capacity & Inventory
  | 'capacity:publish'
  | 'capacity:release'
  | 'capacity:block'
  // Staff Operations
  | 'staff:view_metrics'
  | 'staff:reconcile'
  | 'staff:resolve_outcome'
  | 'staff:verify_patient'
  // Audit
  | 'audit:search'
  | 'audit:export'
  | 'audit:mutate'
  // Administration
  | 'admin:manage_users'
  | 'admin:manage_clinic_settings'
  | 'admin:manage_appointment_types'
  | 'admin:manage_staff_membership'
  | 'admin:override_allocation'
  | 'admin:change_global_policy'
  // Cross-cutting
  | 'tenant:cross_access'
  | 'phi:view_details'
  | 'phi:view_clinical_notes';

export type PermissionResource =
  | 'own_appointments'
  | 'any_patient_appointment'
  | 'authorized_patient_appointment'
  | 'schedule'
  | 'queue'
  | 'waiting_room'
  | 'audit_log'
  | 'capacity'
  | 'clinic_settings'
  | 'staff_workspace'
  | 'encounter';

export interface PermissionContext {
  subjectPatientId?: string;
  actorPatientId?: string;
  verificationReference?: string;
  tenantId?: string;
  actorTenantId?: string;
}

// ── Permission matrix ─────────────────────────────────────────────────────────

const ALLOWED: Partial<Record<AppRole, readonly PermissionAction[]>> = {
  PATIENT: [
    'booking:search',
    'booking:hold',
    'booking:commit',
    'booking:cancel',
    'booking:reschedule',
    'booking:view_own',
  ],

  CAREGIVER: [
    'booking:search',
    'booking:hold',
    'booking:commit',
    'booking:cancel',
    'booking:reschedule',
    'booking:view_own',
  ],

  BOOKING_STAFF: [
    'booking:search',
    'booking:hold',
    'booking:commit',
    'booking:cancel',
    'booking:reschedule',
    'booking:view_any',
    'booking:staff_assist',
    'staff:view_metrics',
    'staff:reconcile',
    'staff:resolve_outcome',
    'staff:verify_patient',
    'capacity:release',
  ],

  CLINICIAN: [
    'clinician:view_schedule',
    'clinician:view_queue',
    'clinician:start_encounter',
    'clinician:mark_attendance',
    'clinician:view_room_readiness',
    'booking:view_own',
  ],

  CLINIC_ADMIN: [
    'booking:view_any',
    'booking:staff_assist',
    'staff:view_metrics',
    'staff:reconcile',
    'staff:resolve_outcome',
    'staff:verify_patient',
    'capacity:publish',
    'capacity:release',
    'capacity:block',
    'admin:manage_clinic_settings',
    'admin:manage_appointment_types',
    'admin:manage_staff_membership',
    'admin:override_allocation',
    'audit:search',
    'clinician:view_schedule',
    'clinician:view_queue',
    'clinician:view_room_readiness',
  ],

  OPERATIONS_MANAGER: [
    'booking:view_any',
    'staff:view_metrics',
    'staff:reconcile',
    'staff:resolve_outcome',
    'capacity:publish',
    'capacity:block',
    'audit:search',
    'clinician:view_schedule',
    'clinician:view_queue',
    'clinician:view_room_readiness',
  ],

  AUDITOR: [
    'audit:search',
    'audit:export',
  ],
};

/** Explicitly prohibited actions – these take precedence over ALLOWED. */
const PROHIBITED: Partial<Record<AppRole, readonly PermissionAction[]>> = {
  PATIENT: [
    'capacity:publish',
    'capacity:block',
    'booking:view_any',
    'audit:search',
    'audit:export',
    'audit:mutate',
    'admin:manage_users',
    'admin:change_global_policy',
    'tenant:cross_access',
    'phi:view_clinical_notes',
  ],
  CAREGIVER: [
    'capacity:publish',
    'booking:view_any',
    'audit:search',
    'audit:mutate',
    'admin:manage_users',
    'tenant:cross_access',
  ],
  BOOKING_STAFF: [
    'audit:mutate',
    'admin:manage_users',
    'admin:change_global_policy',
    'admin:override_allocation',
    'tenant:cross_access',
    'phi:view_clinical_notes',
  ],
  CLINICIAN: [
    'capacity:publish',
    'admin:manage_users',
    'admin:change_global_policy',
    'audit:search',
    'audit:mutate',
    'tenant:cross_access',
    'phi:view_clinical_notes',
  ],
  CLINIC_ADMIN: [
    'admin:manage_users',
    'admin:change_global_policy',
    'audit:mutate',
    'tenant:cross_access',
  ],
  OPERATIONS_MANAGER: [
    'booking:hold',
    'booking:commit',
    'booking:cancel',
    'audit:mutate',
    'admin:manage_users',
    'phi:view_details',
    'phi:view_clinical_notes',
    'tenant:cross_access',
  ],
  AUDITOR: [
    'booking:hold',
    'booking:commit',
    'booking:cancel',
    'booking:staff_assist',
    'capacity:publish',
    'capacity:release',
    'capacity:block',
    'audit:mutate',
    'admin:manage_users',
    'admin:change_global_policy',
    'phi:view_clinical_notes',
    'tenant:cross_access',
  ],
};

// ── Core permission check ─────────────────────────────────────────────────────

/**
 * `can(role, action, resource?, context?)`
 *
 * Returns true only when the action is explicitly allowed and
 * not prohibited for the role, and any contextual constraints pass.
 *
 * Frontend route hiding is NOT authorization.
 * This function is a display-layer guard only.
 */
export function can(
  role: AppRole | undefined,
  action: PermissionAction,
  _resource?: PermissionResource,
  context?: PermissionContext,
): boolean {
  if (!role) return false;

  // Prohibited always wins
  const prohibited = PROHIBITED[role] ?? [];
  if ((prohibited as string[]).includes(action)) return false;

  // Cross-tenant is always denied for all roles
  if (action === 'tenant:cross_access') return false;
  if (context?.tenantId && context.actorTenantId &&
      context.tenantId !== context.actorTenantId) return false;

  // Caregiver must have verified delegation to act on behalf of patient
  if (role === 'CAREGIVER' && action !== 'booking:view_own') {
    if (!context?.verificationReference) return false;
    if (!context?.subjectPatientId) return false;
  }

  // Booking staff must have verification reference before assisted booking
  if (role === 'BOOKING_STAFF' && action === 'booking:staff_assist') {
    if (!context?.verificationReference) return false;
    if (!context?.subjectPatientId) return false;
  }

  // Patient can only view own appointments
  if (role === 'PATIENT' && action === 'booking:view_own') {
    if (context?.subjectPatientId && context?.actorPatientId &&
        context.subjectPatientId !== context.actorPatientId) return false;
  }

  const allowed = ALLOWED[role] ?? [];
  return (allowed as string[]).includes(action);
}

/** Convenience hook for use in React components (no React import needed). */
export function canAll(
  role: AppRole | undefined,
  actions: PermissionAction[],
  resource?: PermissionResource,
  context?: PermissionContext,
): boolean {
  return actions.every(action => can(role, action, resource, context));
}

export function canAny(
  role: AppRole | undefined,
  actions: PermissionAction[],
  resource?: PermissionResource,
  context?: PermissionContext,
): boolean {
  return actions.some(action => can(role, action, resource, context));
}

/** Whether the role is any kind of staff / non-patient role. */
export function isStaffRole(role?: AppRole): boolean {
  return role === 'BOOKING_STAFF' ||
         role === 'CLINICIAN' ||
         role === 'CLINIC_ADMIN' ||
         role === 'OPERATIONS_MANAGER' ||
         role === 'AUDITOR';
}

/** Whether the role can perform clinician workspace actions. */
export function isClinicianRole(role?: AppRole): boolean {
  return role === 'CLINICIAN';
}

/** Whether the role has access to booking operations. */
export function isBookingActor(role?: AppRole): boolean {
  return role === 'PATIENT' || role === 'CAREGIVER' || role === 'BOOKING_STAFF';
}
