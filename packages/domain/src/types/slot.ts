export const slotStates = [
  'PUBLISHED',
  'HELD',
  'BOOKED',
  'EXPIRED',
  'BLOCKED',
  'CANCEL_PENDING',
  'RELEASE_PENDING',
  'ERROR'
] as const;

export type SlotState = (typeof slotStates)[number];
