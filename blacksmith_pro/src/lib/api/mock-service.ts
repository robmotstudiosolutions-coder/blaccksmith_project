import type { AlternativeSlot, ApiError, Booking, Scenario, Slot } from '@/types/booking';

const now = new Date();
const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();
const base = (id: string, hours: number, clinician: string, state: Slot['availabilityState'] = 'PROVISIONAL'): Slot => ({ slotId: id, slotVersion: 4, clinicId: 'clinic-cardiology', clinicName: 'Cardiology Clinic', clinicianId: `clinician-${clinician.toLowerCase().replaceAll(' ', '-')}`, clinicianName: clinician, appointmentTypeId: 'new-cardiology', appointmentType: 'Initial cardiology consultation', startsAt: at(hours), endsAt: at(hours + .5), mode: 'IN_PERSON', availabilityState: state, lastUpdatedAt: now.toISOString(), sourceAuthority: 'SLOTSURE', freshnessState: 'FRESH' });
const inventory = [base('slot-last-available', 48, 'Dr. Adebayo'), base('slot-next', 50, 'Dr. Adebayo'), base('slot-other-clinician', 53, 'Dr. Yusuf')];

let scenario: Scenario = 'success';
export const mockScenario = { get: () => scenario, set: (next: Scenario) => { scenario = next; } };
const delay = (milliseconds = 350) => new Promise(resolve => setTimeout(resolve, milliseconds));
const correlation = () => crypto.randomUUID();

export async function getAvailability(): Promise<Slot[]> { await delay(); return inventory.map(slot => ({ ...slot, freshnessState: scenario === 'degraded' ? 'STALE' : 'FRESH' })); }
export async function createHold(slotId: string, idempotencyKey: string) { await delay(); if (scenario === 'expired') return { holdId: idempotencyKey, slot: inventory.find(item => item.slotId === slotId)!, expiresAt: new Date(Date.now() - 1_000).toISOString(), expired: true }; return { holdId: idempotencyKey, slot: inventory.find(item => item.slotId === slotId)!, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), expired: false }; }
export async function commitHold(holdId: string): Promise<Booking> { await delay(650); const slot = inventory[0]; if (scenario === 'conflict') throw <ApiError>{ code: 'SLOT_UNAVAILABLE', message: 'That appointment was booked by another patient just before your request was completed. No appointment was created for you.', retryable: false, bookingCreated: false, alternatives: await getAlternatives(), correlationId: correlation() }; if (scenario === 'pending') throw <ApiError>{ code: 'BOOKING_OUTCOME_UNKNOWN', message: 'We’re checking whether your appointment was confirmed. Please do not submit this booking again.', retryable: true, correlationId: holdId }; return { bookingId: `booking-${holdId.slice(0, 8)}`, reference: 'SS-20481', slot, status: 'CONFIRMED', createdAt: new Date().toISOString() }; }
export async function getBookingAttempt(idempotencyKey: string): Promise<Booking | undefined> { await delay(900); return scenario === 'pending' ? { bookingId: `booking-${idempotencyKey.slice(0, 8)}`, reference: 'SS-20481', slot: inventory[0], status: 'CONFIRMED', createdAt: new Date().toISOString() } : undefined; }
export async function getAlternatives(): Promise<AlternativeSlot[]> { await delay(); return [{ ...inventory[1], similarity: 'Same clinician' }, { ...inventory[2], similarity: 'Earliest available' }]; }
