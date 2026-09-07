import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BookingService } from '../booking-service.js';

export async function registerCatalogRoutes(
  app: FastifyInstance,
  options: { bookingService: BookingService }
): Promise<void> {
  const { bookingService } = options;

  app.get('/v1/clinics', async () => ({
    clinics: await bookingService.getClinics()
  }));

  app.get('/v1/clinicians', async (request: FastifyRequest) => {
    const query = z
      .object({
        clinicId: z.string().uuid().optional(),
        specialty: z.string().optional()
      })
      .parse(request.query);

    return {
      clinicians: await bookingService.getClinicians(query.clinicId, query.specialty)
    };
  });

  app.get('/v1/appointment-types', async (request: FastifyRequest) => {
    const query = z
      .object({
        clinicId: z.string().uuid().optional()
      })
      .parse(request.query);

    return {
      appointmentTypes: await bookingService.getAppointmentTypes(query.clinicId)
    };
  });
}
