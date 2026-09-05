/** Core vocabulary shared by application services. Transition rules follow in the next increment. */
export const userRoles = ['PATIENT', 'CAREGIVER', 'BOOKING_STAFF', 'CLINIC_ADMIN', 'SYSTEM_ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];
export const slotStates = ['PUBLISHED', 'HELD', 'BOOKED', 'EXPIRED', 'BLOCKED', 'CANCEL_PENDING', 'RELEASE_PENDING', 'ERROR'] as const;
export type SlotState = (typeof slotStates)[number];
export const holdStatuses = ['ACTIVE', 'COMMITTED', 'EXPIRED', 'RELEASED'] as const;
export type HoldStatus = (typeof holdStatuses)[number];
export const bookingStatuses = ['CONFIRMED', 'CANCEL_PENDING', 'CANCELLED', 'RESCHEDULED', 'ERROR'] as const;
export type BookingStatus = (typeof bookingStatuses)[number];
export const activeBookingStatuses = ['CONFIRMED', 'CANCEL_PENDING'] as const satisfies readonly BookingStatus[];
