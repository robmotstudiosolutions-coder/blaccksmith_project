export const bookingStatuses = [
  'CONFIRMED',
  'CANCEL_PENDING',
  'CANCELLED',
  'RESCHEDULED',
  'ERROR'
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export const activeBookingStatuses = [
  'CONFIRMED',
  'CANCEL_PENDING'
] as const satisfies readonly BookingStatus[];
