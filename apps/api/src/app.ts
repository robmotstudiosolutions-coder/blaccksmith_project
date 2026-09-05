import Fastify, { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../../packages/domain/dist/index.js';
import { AppConfig } from './config.js';
import { BookingService } from './booking-service.js';
import { AuthProvider, DevelopmentAuthProvider } from './auth.js';

export function buildApp(
  config: Pick<AppConfig, 'LOG_LEVEL'>,
  bookingService: BookingService,
  authProvider: AuthProvider = new DevelopmentAuthProvider()
): FastifyInstance {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });

  // Security Headers & Correlation ID hook
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('X-Correlation-Id', request.id);
  });

  const patientId = async (request: any): Promise<string> => {
    const user = await authProvider.authenticate(request);
    return user.id;
  };

  const idempotencyKey = (headers: Record<string, unknown>): string =>
    z.string().min(8).max(160).parse(headers['idempotency-key']);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        correlationId: request.id,
        ...error.details
      });
    }
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Please check the information provided.',
        retryable: false,
        correlationId: request.id
      });
    }
    request.log.error(error);
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'We could not complete that request. Please try again.',
      retryable: true,
      correlationId: request.id
    });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'slotsure-api' }));
  app.get('/healthz', async () => ({ status: 'ok', service: 'slotsure-api' }));

  // Catalog & Discovery
  app.get('/v1/clinics', async () => ({ clinics: await bookingService.getClinics() }));
  app.get('/v1/appointment-types', async request => {
    const query = z.object({ clinicId: z.string().uuid().optional() }).parse(request.query);
    return { appointmentTypes: await bookingService.getAppointmentTypes(query.clinicId) };
  });

  // Patient Booking Journey
  app.get('/v1/availability', async request => {
    const query = z.object({ clinicId: z.string().uuid(), appointmentTypeId: z.string().uuid() }).parse(request.query);
    return { slots: await bookingService.availability(query.clinicId, query.appointmentTypeId), authoritative: true };
  });

  app.post('/v1/holds', async request => {
    const body = z.object({ slotId: z.string().uuid() }).parse(request.body);
    const pid = await patientId(request);
    return bookingService.createHold(pid, body.slotId, idempotencyKey(request.headers));
  });

  app.post('/v1/holds/:holdId/commit', async request => {
    const params = z.object({ holdId: z.string().uuid() }).parse(request.params);
    const pid = await patientId(request);
    return bookingService.commitHold(pid, params.holdId, idempotencyKey(request.headers));
  });

  app.post('/v1/bookings/:bookingId/cancel', async request => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const pid = await patientId(request);
    return bookingService.cancelBooking(pid, params.bookingId, idempotencyKey(request.headers));
  });

  app.get('/v1/booking-attempts/:idempotencyKey', async request => {
    const params = z.object({ idempotencyKey: z.string().min(8).max(160) }).parse(request.params);
    const pid = await patientId(request);
    const result = await bookingService.attempt(pid, params.idempotencyKey);
    if (!result) throw new ApplicationError('BOOKING_STATE_UNKNOWN', 'We are still checking the booking status.', 202, true);
    return result;
  });

  app.get('/v1/alternatives', async request => {
    const query = z.object({ clinicId: z.string().uuid(), appointmentTypeId: z.string().uuid() }).parse(request.query);
    return { slots: await bookingService.alternatives(query.clinicId, query.appointmentTypeId) };
  });

  // Staff Operations & Audit
  app.get('/v1/staff/metrics', async () => ({ metrics: await bookingService.getStaffMetrics() }));
  app.get('/v1/staff/reconciliation', async () => ({ items: await bookingService.getReconciliationQueue() }));
  app.get('/v1/staff/audit', async request => {
    const query = z.object({ limit: z.coerce.number().min(1).max(100).default(20) }).parse(request.query);
    return { events: await bookingService.getAuditEvents(query.limit) };
  });

  app.post('/v1/staff/slots/:slotId/release', async request => {
    const params = z.object({ slotId: z.string().uuid() }).parse(request.params);
    await bookingService.releaseCancelledSlot(params.slotId);
    return { success: true, slotId: params.slotId, state: 'PUBLISHED' };
  });

  return app;
}
