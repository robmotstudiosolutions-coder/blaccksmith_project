import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '@slotsure/domain';
import { BookingService } from '../booking-service.js';
import { AuthProvider } from '../auth.js';

export async function registerStaffRoutes(
  app: FastifyInstance,
  options: {
    bookingService: BookingService;
    authProvider: AuthProvider;
  }
): Promise<void> {
  const { bookingService, authProvider } = options;

  const assertStaff = async (request: FastifyRequest) => {
    const user = await authProvider.authenticate(request);
    if (user.role === 'PATIENT') {
      throw new ApplicationError('FORBIDDEN', 'Access denied to staff operations.', 403);
    }
    return user;
  };

  app.get('/v1/staff/metrics', async (request: FastifyRequest) => {
    await assertStaff(request);
    return { metrics: await bookingService.getStaffMetrics() };
  });

  app.get('/v1/staff/reconciliation', async (request: FastifyRequest) => {
    await assertStaff(request);
    return { items: await bookingService.getReconciliationQueue() };
  });

  app.get('/v1/staff/audit', async (request: FastifyRequest) => {
    await assertStaff(request);
    const query = z
      .object({ limit: z.coerce.number().min(1).max(100).default(20) })
      .parse(request.query);
    return { events: await bookingService.getAuditEvents(query.limit) };
  });

  app.post('/v1/staff/slots/:slotId/release', async (request: FastifyRequest) => {
    await assertStaff(request);
    const params = z.object({ slotId: z.string().uuid() }).parse(request.params);
    await bookingService.releaseCancelledSlot(params.slotId);
    return { success: true, slotId: params.slotId, state: 'PUBLISHED' };
  });

  app.post('/v1/staff/slots/publish', async (request: FastifyRequest) => {
    await assertStaff(request);
    const body = z
      .object({
        slots: z.array(
          z.object({
            clinicId: z.string().uuid(),
            appointmentTypeId: z.string().uuid(),
            clinicianId: z.string().uuid().optional(),
            startTime: z.string().datetime(),
            endTime: z.string().datetime()
          })
        )
      })
      .parse(request.body);

    return bookingService.publishSlots(body.slots);
  });
}
