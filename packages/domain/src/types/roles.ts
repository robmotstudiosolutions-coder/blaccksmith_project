export const userRoles = [
  'PATIENT',
  'CAREGIVER',
  'CLINICIAN',
  'BOOKING_STAFF',
  'CLINIC_ADMIN',
  'OPERATIONS_MANAGER',
  'AUDITOR',
  'SYSTEM_ADMIN',
] as const;

export type UserRole = (typeof userRoles)[number];

export function isStaffRole(role?: string): boolean {
  return (
    role === 'BOOKING_STAFF' ||
    role === 'CLINICIAN' ||
    role === 'CLINIC_ADMIN' ||
    role === 'OPERATIONS_MANAGER' ||
    role === 'AUDITOR' ||
    role === 'SYSTEM_ADMIN'
  );
}

export function isClinicianRole(role?: string): boolean {
  return role === 'CLINICIAN';
}

export function isBookingActor(role?: string): boolean {
  return role === 'PATIENT' || role === 'CAREGIVER' || role === 'BOOKING_STAFF';
}

