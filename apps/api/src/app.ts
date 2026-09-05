import Fastify, { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../../../packages/domain/dist/index.js';
import { AppConfig } from './config.js';
import { BookingService } from './booking-service.js';
import { AuthProvider, DevelopmentAuthProvider, hashPassword, verifyPassword, hashToken } from './auth.js';
import { TelehealthService } from './telehealth-service.js';
import { NotificationService } from './notification-service.js';

export function buildApp(
  config: Pick<AppConfig, 'LOG_LEVEL'>,
  bookingService: BookingService,
  authProvider: AuthProvider = new DevelopmentAuthProvider(),
  telehealthService?: TelehealthService,
  notificationService?: NotificationService
): FastifyInstance {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const sql = (bookingService as any)?.sql;
  const telehealth = telehealthService ?? (sql ? new TelehealthService(sql) : undefined);
  const notifications = notificationService ?? (sql ? new NotificationService(sql) : undefined);

  // Security Headers & Correlation ID hook
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('X-Correlation-Id', request.id);
  });

  const getUser = async (request: any) => authProvider.authenticate(request);
  const patientId = async (request: any): Promise<string> => (await getUser(request)).id;

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

  // Authentication & Session Management
  app.post('/v1/auth/register', async request => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2)
    }).parse(request.body);

    if (sql) {
      const existing = await sql<{ id: string }[]>`select id from users where email = ${body.email}`;
      if (existing[0]) throw new ApplicationError('USER_ALREADY_EXISTS', 'An account with that email already exists.', 409);

      const userId = randomUUID();
      const patientId = randomUUID();
      const pwdHash = hashPassword(body.password);
      const identityRef = `PATIENT-${body.email.toUpperCase()}`;

      await sql`
        insert into users (id, identity_reference, display_name, email, password_hash, role, status)
        values (${userId}, ${identityRef}, ${body.displayName}, ${body.email}, ${pwdHash}, 'PATIENT', 'ACTIVE')
      `;
      await sql`
        insert into patients (id, user_id, identity_reference, status)
        values (${patientId}, ${userId}, ${identityRef}, 'ACTIVE')
      `;

      return { success: true, userId, patientId, email: body.email };
    }

    return { success: true, userId: randomUUID(), patientId: randomUUID(), email: body.email };
  });

  app.post('/v1/auth/login', async request => {
    const body = z.object({
      email: z.string().email(),
      password: z.string()
    }).parse(request.body);

    if (sql) {
      const users = await sql<{ id: string; password_hash: string | null; role: string; display_name: string }[]>`
        select id, password_hash, role, display_name from users where email = ${body.email}
      `;
      const user = users[0];
      if (!user || !user.password_hash || !verifyPassword(body.password, user.password_hash)) {
        throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
      }

      const token = randomUUID();
      const tokenH = hashToken(token);
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

      await sql`
        insert into sessions (id, user_id, token_hash, expires_at)
        values (${sessionId}, ${user.id}, ${tokenH}, ${expiresAt})
      `;

      return {
        token,
        user: { id: user.id, email: body.email, displayName: user.display_name, role: user.role }
      };
    }

    return {
      token: randomUUID(),
      user: { id: randomUUID(), email: body.email, displayName: 'Demo User', role: 'PATIENT' }
    };
  });

  app.get('/v1/auth/me', async request => {
    const user = await getUser(request);
    return { user };
  });

  // Catalog & Discovery
  app.get('/v1/clinics', async () => ({ clinics: await bookingService.getClinics() }));
  app.get('/v1/clinicians', async request => {
    const query = z.object({ clinicId: z.string().uuid().optional(), specialty: z.string().optional() }).parse(request.query);
    return { clinicians: await bookingService.getClinicians(query.clinicId, query.specialty) };
  });
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
    const result = await bookingService.commitHold(pid, params.holdId, idempotencyKey(request.headers));
    if (notifications) {
      void notifications.sendBookingConfirmation('patient@example.com', result.correlationId, 'Scheduled Time', 'Clinician', false);
    }
    return result;
  });

  app.post('/v1/bookings/:bookingId/cancel', async request => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const pid = await patientId(request);
    const result = await bookingService.cancelBooking(pid, params.bookingId, idempotencyKey(request.headers));
    if (notifications) {
      void notifications.sendCancellationNotice('patient@example.com', result.correlationId);
    }
    return result;
  });

  app.post('/v1/bookings/:bookingId/reschedule', async request => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const body = z.object({ newSlotId: z.string().uuid() }).parse(request.body);
    const pid = await patientId(request);
    return bookingService.rescheduleBooking(pid, params.bookingId, body.newSlotId, idempotencyKey(request.headers));
  });

  app.get('/v1/patients/me/appointments', async request => {
    const pid = await patientId(request);
    return { appointments: await bookingService.getPatientAppointments(pid) };
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

  // Telehealth Video Consultation
  app.post('/v1/appointments/:bookingId/telehealth/token', async request => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const user = await getUser(request);
    if (!telehealth) throw new ApplicationError('INTERNAL_ERROR', 'Telehealth service is unavailable.', 500);
    return telehealth.getSessionToken(params.bookingId, user.id, user.role);
  });

  // Staff Operations & Capacity Management
  app.get('/v1/staff/metrics', async request => {
    const user = await getUser(request);
    if (user.role === 'PATIENT') throw new ApplicationError('FORBIDDEN', 'Access denied to staff operations.', 403);
    return { metrics: await bookingService.getStaffMetrics() };
  });

  app.get('/v1/staff/reconciliation', async request => {
    const user = await getUser(request);
    if (user.role === 'PATIENT') throw new ApplicationError('FORBIDDEN', 'Access denied to staff operations.', 403);
    return { items: await bookingService.getReconciliationQueue() };
  });

  app.get('/v1/staff/audit', async request => {
    const user = await getUser(request);
    if (user.role === 'PATIENT') throw new ApplicationError('FORBIDDEN', 'Access denied to audit logs.', 403);
    const query = z.object({ limit: z.coerce.number().min(1).max(100).default(20) }).parse(request.query);
    return { events: await bookingService.getAuditEvents(query.limit) };
  });

  app.post('/v1/staff/slots/:slotId/release', async request => {
    const user = await getUser(request);
    if (user.role === 'PATIENT') throw new ApplicationError('FORBIDDEN', 'Access denied.', 403);
    const params = z.object({ slotId: z.string().uuid() }).parse(request.params);
    await bookingService.releaseCancelledSlot(params.slotId);
    return { success: true, slotId: params.slotId, state: 'PUBLISHED' };
  });

  app.post('/v1/staff/slots/publish', async request => {
    const user = await getUser(request);
    if (user.role === 'PATIENT') throw new ApplicationError('FORBIDDEN', 'Access denied to capacity management.', 403);
    const body = z.object({
      slots: z.array(z.object({
        clinicId: z.string().uuid(),
        appointmentTypeId: z.string().uuid(),
        clinicianId: z.string().uuid().optional(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime()
      }))
    }).parse(request.body);
    return bookingService.publishSlots(body.slots);
  });

  return app;
}
