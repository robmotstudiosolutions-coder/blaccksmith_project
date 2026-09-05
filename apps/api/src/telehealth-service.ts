import { randomUUID, createHmac } from 'node:crypto';
import { ApplicationError, UserRole } from '../../../packages/domain/dist/index.js';

export type TelehealthSessionInfo = {
  bookingId: string;
  roomName: string;
  token: string;
  participantId: string;
  participantName: string;
  role: 'PATIENT' | 'CLINICIAN' | 'OBSERVER';
  appointmentStartTime: string;
  appointmentEndTime: string;
  expiresAt: string;
};

export interface VideoTokenProvider {
  createToken(roomName: string, participantId: string, participantName: string, isClinician: boolean): Promise<string>;
}

export class DefaultVideoTokenProvider implements VideoTokenProvider {
  private readonly secretKey: string;

  constructor(secretKey = 'slotsure_telehealth_dev_secret_key_tbd_hospital') {
    this.secretKey = secretKey;
  }

  async createToken(roomName: string, participantId: string, participantName: string, isClinician: boolean): Promise<string> {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        room: roomName,
        sub: participantId,
        name: participantName,
        clinician: isClinician,
        video: true,
        audio: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200 // 2 hour max
      })
    ).toString('base64url');

    const signature = createHmac('sha256', this.secretKey).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }
}

export class TelehealthService {
  constructor(
    private readonly sql: any,
    private readonly tokenProvider: VideoTokenProvider = new DefaultVideoTokenProvider()
  ) {}

  async getSessionToken(
    bookingId: string,
    userId: string,
    userRole: UserRole,
    overrideTimeCheck = false
  ): Promise<TelehealthSessionInfo> {
    const rows = await this.sql<
      {
        bookingId: string;
        patientId: string;
        patientName: string;
        clinicianId: string | null;
        clinicianName: string | null;
        startTime: Date;
        endTime: Date;
        status: string;
        mode: string;
      }[]
    >`
      select 
        bookings.id as "bookingId",
        bookings.patient_id as "patientId",
        users.display_name as "patientName",
        bookings.clinician_id as "clinicianId",
        clinicians.name as "clinicianName",
        slots.start_time as "startTime",
        slots.end_time as "endTime",
        bookings.status,
        appointment_types.mode
      from bookings
      inner join slots on slots.id = bookings.slot_id
      inner join appointment_types on appointment_types.id = bookings.appointment_type_id
      inner join patients on patients.id = bookings.patient_id
      inner join users on users.id = patients.user_id
      left join clinicians on clinicians.id = bookings.clinician_id
      where bookings.id = ${bookingId}
    `;

    const booking = rows[0];
    if (!booking) {
      throw new ApplicationError('SLOT_NOT_FOUND', 'The requested appointment could not be found.', 404);
    }

    if (booking.status !== 'CONFIRMED') {
      throw new ApplicationError('VALIDATION_ERROR', 'Telehealth sessions are only available for confirmed appointments.', 409);
    }

    if (booking.mode !== 'VIDEO') {
      throw new ApplicationError('VALIDATION_ERROR', 'This appointment is scheduled as an in-person consultation.', 400);
    }

    // Check authorization: Must be patient, assigned clinician, or staff/admin
    const isPatient = booking.patientId === userId;
    const isClinician = booking.clinicianId === userId || userRole === 'CLINICIAN';
    const isStaff = userRole === 'BOOKING_STAFF' || userRole === 'CLINIC_ADMIN' || userRole === 'SYSTEM_ADMIN';

    if (!isPatient && !isClinician && !isStaff) {
      throw new ApplicationError('TELEHEALTH_UNAUTHORIZED', 'You are not authorized to join this consultation room.', 403);
    }

    // Check time window: [startTime - 10 min, endTime + 15 min]
    if (!overrideTimeCheck) {
      const now = Date.now();
      const startTimeMs = new Date(booking.startTime).getTime();
      const endTimeMs = new Date(booking.endTime).getTime();
      const earlyWindow = startTimeMs - 10 * 60 * 1000;
      const lateWindow = endTimeMs + 15 * 60 * 1000;

      if (now < earlyWindow) {
        throw new ApplicationError(
          'TELEHEALTH_TOO_EARLY',
          'This consultation room opens 10 minutes prior to your scheduled appointment.',
          403,
          true,
          { opensAt: new Date(earlyWindow).toISOString() }
        );
      }

      if (now > lateWindow) {
        throw new ApplicationError(
          'TELEHEALTH_EXPIRED',
          'This consultation window has concluded. Please contact your clinic if you missed your visit.',
          403,
          false
        );
      }
    }

    const roomName = `slotsure-room-${booking.bookingId}`;
    const participantName = isClinician
      ? (booking.clinicianName ?? 'Attending Clinician')
      : (booking.patientName ?? 'Patient');

    const token = await this.tokenProvider.createToken(roomName, userId, participantName, isClinician);

    // Record immutable audit event
    await this.sql`
      insert into audit_events (action, target_type, target_id, outcome, correlation_id)
      values ('TELEHEALTH_ROOM_ACCESSED', 'BOOKING', ${bookingId}, 'SUCCESS', ${randomUUID()})
    `;

    return {
      bookingId: booking.bookingId,
      roomName,
      token,
      participantId: userId,
      participantName,
      role: isClinician ? 'CLINICIAN' : isStaff ? 'OBSERVER' : 'PATIENT',
      appointmentStartTime: booking.startTime.toISOString(),
      appointmentEndTime: booking.endTime.toISOString(),
      expiresAt: new Date(Date.now() + 7200 * 1000).toISOString()
    };
  }
}
