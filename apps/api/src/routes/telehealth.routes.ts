import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '@slotsure/domain';
import { TelehealthService } from '../telehealth-service.js';
import { AuthProvider } from '../auth.js';

export async function registerTelehealthRoutes(
  app: FastifyInstance,
  options: {
    telehealth?: TelehealthService;
    authProvider: AuthProvider;
  }
): Promise<void> {
  const { telehealth, authProvider } = options;

  app.post('/v1/appointments/:bookingId/telehealth/token', async (request: FastifyRequest) => {
    const params = z.object({ bookingId: z.string().uuid() }).parse(request.params);
    const user = await authProvider.authenticate(request);

    if (!telehealth) {
      throw new ApplicationError('INTERNAL_ERROR', 'Telehealth service is unavailable.', 500);
    }

    return telehealth.getSessionToken(params.bookingId, user.id, user.role);
  });
}
