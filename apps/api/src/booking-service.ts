import { randomUUID, createHash } from 'node:crypto';
import { createDatabase } from '../../../packages/database/dist/index.js';
import { ApplicationError } from '../../../packages/domain/dist/index.js';

export type AvailabilitySlot = { slotId: string; clinicId: string; appointmentTypeId: string; clinicianId: string | null; startsAt: string; endsAt: string; version: number; state: string };
export type HoldResult = { holdId: string; slotId: string; expiresAt: string; state: 'HELD' };
export type BookingResult = { bookingId: string; status: 'CONFIRMED'; slotId: string; correlationId: string; replayed?: boolean };
export type CancellationResult = { bookingId: string; status: 'CANCEL_PENDING'; slotId: string; correlationId: string; replayed?: boolean };

export class BookingService {
  private readonly sql: any;
  constructor(url: string, private readonly holdSeconds: number) { this.sql = createDatabase(url).client; }
  async close(): Promise<void> { await this.sql.end(); }

  async availability(clinicId: string, appointmentTypeId: string): Promise<AvailabilitySlot[]> {
    const rows = await this.sql<AvailabilitySlot[]>`select id as "slotId", clinic_id as "clinicId", appointment_type_id as "appointmentTypeId", clinician_id as "clinicianId", start_time as "startsAt", end_time as "endsAt", version, state from slots where clinic_id = ${clinicId} and appointment_type_id = ${appointmentTypeId} and state = 'PUBLISHED' and start_time > now() order by start_time`;
    return rows;
  }

  async createHold(patientId: string, slotId: string, key: string): Promise<HoldResult> {
    return this.sql.begin(async (sql: any) => {
      const existing = await sql<HoldResult[]>`select id as "holdId", slot_id as "slotId", expires_at as "expiresAt", 'HELD'::text as state from holds where patient_id = ${patientId} and idempotency_key = ${key} for update`;
      if (existing[0] && new Date(existing[0].expiresAt) > new Date()) return existing[0];
      const slots = await sql<{ id: string; state: string }[]>`select id, state from slots where id = ${slotId} for update`;
      if (!slots[0]) throw new ApplicationError('SLOT_NOT_FOUND', 'The appointment time could not be found.', 404);
      if (slots[0].state !== 'PUBLISHED') throw new ApplicationError('SLOT_NOT_AVAILABLE', 'That appointment is no longer available.', 409, false);
      const expiresAt = new Date(Date.now() + this.holdSeconds * 1000);
      const id = randomUUID();
      await sql`update slots set state = 'HELD', version = version + 1, updated_at = now() where id = ${slotId}`;
      await sql`insert into holds (id, slot_id, patient_id, idempotency_key, expires_at) values (${id}, ${slotId}, ${patientId}, ${key}, ${expiresAt})`;
      await sql`insert into audit_events (action, target_type, target_id, outcome, correlation_id) values ('HOLD_CREATED', 'HOLD', ${id}, 'SUCCESS', ${key})`;
      return { holdId: id, slotId, expiresAt: expiresAt.toISOString(), state: 'HELD' };
    });
  }

  async commitHold(patientId: string, holdId: string, key: string): Promise<BookingResult> {
    const correlationId = randomUUID(); const requestHash = createHash('sha256').update(`${holdId}:${patientId}`).digest('hex');
    return this.sql.begin(async (sql: any) => {
      const prior = await sql<{ response: string | null; request_hash: string }[]>`select response, request_hash from idempotency_commands where patient_id = ${patientId} and operation = 'COMMIT_HOLD' and idempotency_key = ${key} for update`;
      if (prior[0]?.request_hash !== undefined) {
        if (prior[0].request_hash !== requestHash) throw new ApplicationError('VALIDATION_ERROR', 'This request key belongs to a different booking request.', 422);
        if (prior[0].response) return { ...JSON.parse(prior[0].response) as BookingResult, replayed: true };
      } else await sql`insert into idempotency_commands (patient_id, operation, idempotency_key, request_hash, correlation_id) values (${patientId}, 'COMMIT_HOLD', ${key}, ${requestHash}, ${correlationId})`;
      const holds = await sql<{ id: string; slot_id: string; status: string; expires_at: Date }[]>`select id, slot_id, status, expires_at from holds where id = ${holdId} and patient_id = ${patientId} for update`;
      const hold = holds[0];
      if (!hold) throw new ApplicationError('SLOT_NOT_FOUND', 'The temporary reservation could not be found.', 404);
      const slots = await sql<{ id: string; state: string; clinic_id: string; appointment_type_id: string; clinician_id: string | null }[]>`select id, state, clinic_id, appointment_type_id, clinician_id from slots where id = ${hold.slot_id} for update`;
      const slot = slots[0];
      if (!slot || hold.status !== 'ACTIVE' || hold.expires_at <= new Date() || slot.state !== 'HELD') {
        await sql`update holds set status = 'EXPIRED', updated_at = now() where id = ${holdId} and status = 'ACTIVE'`;
        throw new ApplicationError('HOLD_EXPIRED', 'Your temporary reservation expired. Check availability again to see the latest options.', 409, false);
      }
      try {
        const bookingId = randomUUID();
        await sql`insert into bookings (id, patient_id, slot_id, appointment_type_id, clinic_id, clinician_id, idempotency_key) values (${bookingId}, ${patientId}, ${slot.id}, ${slot.appointment_type_id}, ${slot.clinic_id}, ${slot.clinician_id}, ${key})`;
        await sql`update holds set status = 'COMMITTED', updated_at = now() where id = ${holdId}`;
        await sql`update slots set state = 'BOOKED', version = version + 1, updated_at = now() where id = ${slot.id}`;
        const result: BookingResult = { bookingId, status: 'CONFIRMED', slotId: slot.id, correlationId };
        await sql`update idempotency_commands set status = 'COMPLETED', response = ${JSON.stringify(result)}, updated_at = now() where patient_id = ${patientId} and operation = 'COMMIT_HOLD' and idempotency_key = ${key}`;
        await sql`insert into audit_events (action, target_type, target_id, outcome, correlation_id) values ('BOOKING_CREATED', 'BOOKING', ${bookingId}, 'SUCCESS', ${correlationId})`;
        return result;
      } catch (error: unknown) {
        if (error instanceof ApplicationError) throw error;
        const alternatives = await this.alternatives(slot.clinic_id, slot.appointment_type_id);
        throw new ApplicationError('BOOKING_CONFLICT', 'That appointment is no longer available.', 409, false, { bookingCreated: false, alternatives });
      }
    });
  }

  async attempt(patientId: string, key: string): Promise<BookingResult | undefined> { const rows = await this.sql<{ response: string | null }[]>`select response from idempotency_commands where patient_id = ${patientId} and operation = 'COMMIT_HOLD' and idempotency_key = ${key}`; return rows[0]?.response ? JSON.parse(rows[0].response) as BookingResult : undefined; }
  async alternatives(clinicId: string, appointmentTypeId: string): Promise<AvailabilitySlot[]> { return (await this.availability(clinicId, appointmentTypeId)).slice(0, 3); }

  async cancelBooking(patientId: string, bookingId: string, key: string): Promise<CancellationResult> {
    const correlationId = randomUUID(); const requestHash = createHash('sha256').update(`${bookingId}:${patientId}`).digest('hex');
    return this.sql.begin(async (sql: any) => {
      const prior = await sql<{ response: string | null; request_hash: string }[]>`select response, request_hash from idempotency_commands where patient_id = ${patientId} and operation = 'CANCEL_BOOKING' and idempotency_key = ${key} for update`;
      if (prior[0]) { if (prior[0].request_hash !== requestHash) throw new ApplicationError('VALIDATION_ERROR', 'This request key belongs to a different cancellation request.', 422); if (prior[0].response) return { ...JSON.parse(prior[0].response) as CancellationResult, replayed: true }; }
      else await sql`insert into idempotency_commands (patient_id, operation, idempotency_key, request_hash, correlation_id) values (${patientId}, 'CANCEL_BOOKING', ${key}, ${requestHash}, ${correlationId})`;
      const bookings = await sql<{ id: string; slot_id: string; status: string }[]>`select id, slot_id, status from bookings where id = ${bookingId} and patient_id = ${patientId} for update`;
      const booking = bookings[0];
      if (!booking) throw new ApplicationError('SLOT_NOT_FOUND', 'The appointment could not be found.', 404);
      if (booking.status !== 'CONFIRMED') throw new ApplicationError('VALIDATION_ERROR', 'This appointment cannot be cancelled in its current state.', 409);
      await sql`select id from slots where id = ${booking.slot_id} for update`;
      await sql`update bookings set status = 'CANCEL_PENDING', cancelled_at = now(), updated_at = now() where id = ${booking.id}`;
      await sql`update slots set state = 'CANCEL_PENDING', version = version + 1, updated_at = now() where id = ${booking.slot_id}`;
      const result: CancellationResult = { bookingId, status: 'CANCEL_PENDING', slotId: booking.slot_id, correlationId };
      await sql`update idempotency_commands set status = 'COMPLETED', response = ${JSON.stringify(result)}, updated_at = now() where patient_id = ${patientId} and operation = 'CANCEL_BOOKING' and idempotency_key = ${key}`;
      await sql`insert into audit_events (action, target_type, target_id, outcome, correlation_id) values ('BOOKING_CANCELLED', 'BOOKING', ${booking.id}, 'PENDING_RELEASE', ${correlationId})`;
      return result;
    });
  }

  async releaseCancelledSlot(slotId: string, correlationId = randomUUID()): Promise<void> {
    await this.sql.begin(async (sql: any) => {
      const slots = await sql<{ id: string; state: string }[]>`select id, state from slots where id = ${slotId} for update`;
      if (!slots[0]) throw new ApplicationError('SLOT_NOT_FOUND', 'The appointment time could not be found.', 404);
      if (slots[0].state !== 'CANCEL_PENDING') throw new ApplicationError('VALIDATION_ERROR', 'This slot is not awaiting controlled release.', 409);
      await sql`update slots set state = 'RELEASE_PENDING', version = version + 1, updated_at = now() where id = ${slotId}`;
      await sql`update bookings set status = 'CANCELLED', updated_at = now() where slot_id = ${slotId} and status = 'CANCEL_PENDING'`;
      await sql`update slots set state = 'PUBLISHED', version = version + 1, updated_at = now() where id = ${slotId}`;
      await sql`insert into audit_events (action, target_type, target_id, outcome, correlation_id) values ('INVENTORY_RELEASED', 'SLOT', ${slotId}, 'SUCCESS', ${correlationId})`;
    });
  }
}
