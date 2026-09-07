import type { SlotState } from '../types/slot.js';

const slotTransitions: Record<SlotState, readonly SlotState[]> = {
  PUBLISHED: ['HELD', 'BLOCKED', 'ERROR'],
  HELD: ['PUBLISHED', 'BOOKED', 'EXPIRED', 'ERROR'],
  BOOKED: ['CANCEL_PENDING', 'ERROR'],
  EXPIRED: ['PUBLISHED', 'BLOCKED', 'ERROR'],
  BLOCKED: ['PUBLISHED', 'ERROR'],
  CANCEL_PENDING: ['RELEASE_PENDING', 'ERROR'],
  RELEASE_PENDING: ['PUBLISHED', 'BLOCKED', 'ERROR'],
  ERROR: []
};

export const canTransitionSlot = (from: SlotState, to: SlotState): boolean => {
  const allowed = slotTransitions[from];
  return allowed ? allowed.includes(to) : false;
};
