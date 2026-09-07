import { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({
    name: 'SlotSure API',
    status: 'online',
    service: 'slotsure-api',
    healthCheck: '/health',
    endpoints: {
      health: '/health',
      clinics: '/v1/clinics',
      clinicians: '/v1/clinicians',
      appointmentTypes: '/v1/appointment-types'
    }
  }));

  app.get('/health', async () => ({ status: 'ok', service: 'slotsure-api' }));
  app.get('/healthz', async () => ({ status: 'ok', service: 'slotsure-api' }));
}
