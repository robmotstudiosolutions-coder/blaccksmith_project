export const userRoles = [
  'PATIENT',
  'CAREGIVER',
  'CLINICIAN',
  'BOOKING_STAFF',
  'CLINIC_ADMIN',
  'SYSTEM_ADMIN'
] as const;

export type UserRole = (typeof userRoles)[number];
