import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '@slotsure/domain';
import { BookingService } from '../booking-service.js';
import { AuthProvider } from '../auth.js';
import { NotificationService } from '../notification-service.js';

export async function registerBookingRoutes(
  app: FastifyInstance,
  options: {
    bookingService: BookingService;
    authProvider: AuthProvider;
    notifications?: NotificationService;
  }
): Promise<void> {
  const { bookingService, authProvider, notifications } = options;

  const patientId = async (request: FastifyRequest): Promise<string> => {
    const user = await authProvider.authenticate(request);
    return user.id;
  };

  const idempotencyKey = (headers: Record<string, unknown>): string =>
    z.string().min(8).max(160).parse(headers['idempotency-key']);

  // Availability Query
  app.get('/v1/availability', async (request: FastifyRequest) => {
    const query = z
      .object({
        clinicId: z.string().uuid(),
        appointmentTypeId: z.string().uuid()
      })
      .parse(request.query);

    return {
      slots: await bookingService.availability(query.clinicId, query.appointmentTypeId),
      authoritative: true
    };
  });

  // Hold Placement
  app.post('/v1/holds', async (request: FastifyRequest) => {
    const body = z.object({ slotId: z.string().uuid() }).parse(request.body);
    const pid = await patientId(request);
    return bookingService.createHold(pid, body.slotId, idempotencyKey(request.headers as Record<string, unknown>));
  });

  // Commit Hold into Confirmed Booking
  app.post('/v1/holds/:holdId/commit', async (request: FastifyRequest) => {
    const params = z.object({ holdId: z.string().uuid() }).parse(request.params);
    const pid = await patientId(request);
    const result = await bookingService.commitHold(
      pid,
      params.holdId,
      idempotencyKey(request.headers as Record<string, unknown>)
    );

    if (notifications) {
      void notifications.sendBookingConfirmation(
        'patient@example.com',
        result.correlationId,
        'Scheduled Time',
        'Clinician',
        false
      );
    }

    return result;
  });

  // Cancel Booking
  app.post('/v1/bookings/:bookingId/cancel', async (request: FastifyRequest) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const pid = await patientId(request);
    const result = await bookingService.cancelBooking(
      pid,
      params.bookingId,
      idempotencyKey(request.headers as Record<string, unknown>)
    );

    if (notifications) {
      void notifications.sendCancellationNotice('patient@example.com', result.correlationId);
    }

    return result;
  });

  // Reschedule Booking
  app.post('/v1/bookings/:bookingId/reschedule', async (request: FastifyRequest) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = z.object({ newSlotId: z.string().uuid() }).parse(request.body);
    const pid = await patientId(request);
    return bookingService.rescheduleBooking(
      pid,
      params.bookingId,
      body.newSlotId,
      idempotencyKey(request.headers as Record<string, unknown>)
    );
  });

  // Patient Appointments List
  app.get('/v1/patients/me/appointments', async (request: FastifyRequest) => {
    const pid = await patientId(request);
    return { appointments: await bookingService.getPatientAppointments(pid) };
  });

  // Check Idempotent Booking Attempt
  app.get('/v1/booking-attempts/:idempotencyKey', async (request: FastifyRequest) => {
    const params = z.object({ idempotencyKey: z.string().min(8).max(160) }).parse(request.params);
    const pid = await patientId(request);
    const result = await bookingService.attempt(pid, params.idempotencyKey);
    if (!result) {
      throw new ApplicationError('BOOKING_STATE_UNKNOWN', 'We are still checking the booking status.', 202, true);
    }
    return result;
  });

  // Alternative Slots Suggestion
  app.get('/v1/alternatives', async (request: FastifyRequest) => {
    const query = z
      .object({
        clinicId: z.string().uuid(),
        appointmentTypeId: z.string().uuid()
      })
      .parse(request.query);

    return {
      slots: await bookingService.alternatives(query.clinicId, query.appointmentTypeId)
    };
  });
}
