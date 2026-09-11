import { describe, it, expect } from 'vitest';
import { can, canAll, canAny, isStaffRole, isClinicianRole, isBookingActor } from '../src/lib/permissions';

describe('Permissions – RBAC Policy Enforcement', () => {

  // ── Patient permissions ─────────────────────────────────────────────────

  it('patient can search, hold, commit, cancel, reschedule own appointments', () => {
    expect(can('PATIENT', 'booking:search')).toBe(true);
    expect(can('PATIENT', 'booking:hold')).toBe(true);
    expect(can('PATIENT', 'booking:commit')).toBe(true);
    expect(can('PATIENT', 'booking:cancel')).toBe(true);
    expect(can('PATIENT', 'booking:reschedule')).toBe(true);
    expect(can('PATIENT', 'booking:view_own')).toBe(true);
  });

  // ── NEGATIVE: Patient prohibited actions ─────────────────────────────────

  it('NEGATIVE: patient cannot view another patient\'s appointments (cross-patient)', () => {
    expect(can('PATIENT', 'booking:view_any')).toBe(false);
  });

  it('NEGATIVE: patient cannot access audit search', () => {
    expect(can('PATIENT', 'audit:search')).toBe(false);
  });

  it('NEGATIVE: patient cannot publish capacity', () => {
    expect(can('PATIENT', 'capacity:publish')).toBe(false);
  });

  it('NEGATIVE: patient viewing own appointments is denied when subject ≠ actor', () => {
    expect(can('PATIENT', 'booking:view_own', 'own_appointments', {
      subjectPatientId: 'patient-B',
      actorPatientId: 'patient-A', // Different patient
    })).toBe(false);
  });

  // ── Caregiver permissions ───────────────────────────────────────────────

  it('caregiver with delegation and subject can book on behalf', () => {
    expect(can('CAREGIVER', 'booking:hold', undefined, {
      subjectPatientId: 'patient-123',
      verificationReference: 'CAREGIVER-TOKEN-ABC',
    })).toBe(true);
  });

  // ── NEGATIVE: Caregiver without delegation ───────────────────────────────

  it('NEGATIVE: caregiver without verification reference cannot book for a patient', () => {
    expect(can('CAREGIVER', 'booking:hold', undefined, {
      subjectPatientId: 'patient-123',
      // No verificationReference
    })).toBe(false);
  });

  it('NEGATIVE: caregiver accessing unauthorized patient (no delegation)', () => {
    expect(can('CAREGIVER', 'booking:commit', undefined, {
      subjectPatientId: undefined, // No authorized patient
      verificationReference: undefined,
    })).toBe(false);
  });

  // ── Staff permissions ────────────────────────────────────────────────────

  it('booking staff with verification can assist patient booking', () => {
    expect(can('BOOKING_STAFF', 'booking:staff_assist', 'staff_workspace', {
      subjectPatientId: 'patient-999',
      verificationReference: 'STAFF-VERIFIED-1234',
    })).toBe(true);
  });

  // ── NEGATIVE: Staff without verification ─────────────────────────────────

  it('NEGATIVE: booking staff cannot assist without patient verification', () => {
    expect(can('BOOKING_STAFF', 'booking:staff_assist', 'staff_workspace', {
      subjectPatientId: 'patient-999',
      // No verificationReference
    })).toBe(false);
  });

  it('NEGATIVE: booking staff cannot mutate audit records', () => {
    expect(can('BOOKING_STAFF', 'audit:mutate')).toBe(false);
  });

  it('NEGATIVE: booking staff cannot manage users', () => {
    expect(can('BOOKING_STAFF', 'admin:manage_users')).toBe(false);
  });

  it('NEGATIVE: booking staff cannot change global policy', () => {
    expect(can('BOOKING_STAFF', 'admin:change_global_policy')).toBe(false);
  });

  // ── Clinician permissions ────────────────────────────────────────────────

  it('clinician can view schedule, queue, start encounter, mark attendance', () => {
    expect(can('CLINICIAN', 'clinician:view_schedule')).toBe(true);
    expect(can('CLINICIAN', 'clinician:view_queue')).toBe(true);
    expect(can('CLINICIAN', 'clinician:start_encounter')).toBe(true);
    expect(can('CLINICIAN', 'clinician:mark_attendance')).toBe(true);
    expect(can('CLINICIAN', 'clinician:view_room_readiness')).toBe(true);
  });

  // ── NEGATIVE: Clinician capacity administration ───────────────────────────

  it('NEGATIVE: clinician cannot publish capacity', () => {
    expect(can('CLINICIAN', 'capacity:publish')).toBe(false);
  });

  it('NEGATIVE: clinician cannot search audit events', () => {
    expect(can('CLINICIAN', 'audit:search')).toBe(false);
  });

  it('NEGATIVE: clinician cannot manage users', () => {
    expect(can('CLINICIAN', 'admin:manage_users')).toBe(false);
  });

  it('NEGATIVE: clinician cannot change global policy', () => {
    expect(can('CLINICIAN', 'admin:change_global_policy')).toBe(false);
  });

  // ── Clinic admin permissions ─────────────────────────────────────────────

  it('clinic admin can manage settings, appointment types, staff membership', () => {
    expect(can('CLINIC_ADMIN', 'admin:manage_clinic_settings')).toBe(true);
    expect(can('CLINIC_ADMIN', 'admin:manage_appointment_types')).toBe(true);
    expect(can('CLINIC_ADMIN', 'admin:manage_staff_membership')).toBe(true);
    expect(can('CLINIC_ADMIN', 'audit:search')).toBe(true);
    expect(can('CLINIC_ADMIN', 'capacity:publish')).toBe(true);
  });

  // ── NEGATIVE: Clinic admin cross-tenant ──────────────────────────────────

  it('NEGATIVE: clinic admin cannot access another tenant (cross-tenant)', () => {
    expect(can('CLINIC_ADMIN', 'capacity:publish', undefined, {
      tenantId: 'hospital-B',
      actorTenantId: 'hospital-A', // Different tenant
    })).toBe(false);
  });

  it('NEGATIVE: clinic admin cannot mutate audit records', () => {
    expect(can('CLINIC_ADMIN', 'audit:mutate')).toBe(false);
  });

  it('NEGATIVE: clinic admin cannot manage users (global)', () => {
    expect(can('CLINIC_ADMIN', 'admin:manage_users')).toBe(false);
  });

  // ── Operations manager permissions ───────────────────────────────────────

  it('operations manager can view metrics and monitor capacity', () => {
    expect(can('OPERATIONS_MANAGER', 'staff:view_metrics')).toBe(true);
    expect(can('OPERATIONS_MANAGER', 'capacity:publish')).toBe(true);
    expect(can('OPERATIONS_MANAGER', 'audit:search')).toBe(true);
  });

  it('NEGATIVE: operations manager cannot view patient PHI details', () => {
    expect(can('OPERATIONS_MANAGER', 'phi:view_details')).toBe(false);
  });

  it('NEGATIVE: operations manager cannot book appointments', () => {
    expect(can('OPERATIONS_MANAGER', 'booking:hold')).toBe(false);
    expect(can('OPERATIONS_MANAGER', 'booking:commit')).toBe(false);
  });

  // ── Auditor permissions ──────────────────────────────────────────────────

  it('auditor can search audit events and export evidence', () => {
    expect(can('AUDITOR', 'audit:search')).toBe(true);
    expect(can('AUDITOR', 'audit:export')).toBe(true);
  });

  // ── NEGATIVE: Unauthorized audit search ──────────────────────────────────

  it('NEGATIVE: patient cannot search audit events (unauthorized audit search)', () => {
    expect(can('PATIENT', 'audit:search')).toBe(false);
  });

  it('NEGATIVE: auditor cannot mutate audit records (immutable)', () => {
    expect(can('AUDITOR', 'audit:mutate')).toBe(false);
  });

  it('NEGATIVE: auditor cannot book appointments', () => {
    expect(can('AUDITOR', 'booking:hold')).toBe(false);
    expect(can('AUDITOR', 'booking:commit')).toBe(false);
    expect(can('AUDITOR', 'booking:cancel')).toBe(false);
    expect(can('AUDITOR', 'booking:staff_assist')).toBe(false);
  });

  // ── Cross-tenant denial (all roles) ─────────────────────────────────────

  it('NEGATIVE: cross-tenant access denied for all roles', () => {
    const roles: Parameters<typeof can>[0][] = ['PATIENT', 'BOOKING_STAFF', 'CLINICIAN', 'CLINIC_ADMIN', 'OPERATIONS_MANAGER', 'AUDITOR'];
    for (const role of roles) {
      expect(can(role, 'tenant:cross_access')).toBe(false);
      expect(can(role, 'booking:search', undefined, {
        tenantId: 'hospital-X',
        actorTenantId: 'hospital-Y',
      })).toBe(false);
    }
  });

  // ── Production role self-selection ───────────────────────────────────────

  it('NEGATIVE: undefined role (unauthenticated) cannot do anything', () => {
    expect(can(undefined, 'booking:search')).toBe(false);
    expect(can(undefined, 'booking:hold')).toBe(false);
    expect(can(undefined, 'audit:search')).toBe(false);
  });

  // ── Role predicate helpers ───────────────────────────────────────────────

  it('isStaffRole correctly identifies staff roles', () => {
    expect(isStaffRole('BOOKING_STAFF')).toBe(true);
    expect(isStaffRole('CLINICIAN')).toBe(true);
    expect(isStaffRole('CLINIC_ADMIN')).toBe(true);
    expect(isStaffRole('OPERATIONS_MANAGER')).toBe(true);
    expect(isStaffRole('AUDITOR')).toBe(true);
    expect(isStaffRole('PATIENT')).toBe(false);
    expect(isStaffRole('CAREGIVER')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  it('isClinicianRole correctly identifies clinician role only', () => {
    expect(isClinicianRole('CLINICIAN')).toBe(true);
    expect(isClinicianRole('CLINIC_ADMIN')).toBe(false);
    expect(isClinicianRole('BOOKING_STAFF')).toBe(false);
    expect(isClinicianRole('PATIENT')).toBe(false);
  });

  // ── canAll / canAny helpers ──────────────────────────────────────────────

  it('canAll returns true only when ALL actions are permitted', () => {
    expect(canAll('BOOKING_STAFF', ['booking:search', 'booking:hold', 'staff:view_metrics'])).toBe(true);
    expect(canAll('BOOKING_STAFF', ['booking:search', 'audit:mutate'])).toBe(false);
  });

  it('canAny returns true when at least ONE action is permitted', () => {
    expect(canAny('AUDITOR', ['audit:search', 'booking:hold'])).toBe(true); // audit:search yes, booking:hold no
    expect(canAny('AUDITOR', ['booking:hold', 'booking:commit'])).toBe(false);
  });
});
