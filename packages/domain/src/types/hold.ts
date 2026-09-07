export const holdStatuses = ['ACTIVE', 'COMMITTED', 'EXPIRED', 'RELEASED'] as const;

export type HoldStatus = (typeof holdStatuses)[number];
