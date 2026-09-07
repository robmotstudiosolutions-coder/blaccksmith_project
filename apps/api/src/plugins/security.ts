import { FastifyInstance } from 'fastify';

export async function registerSecurityHeaders(app: FastifyInstance): Promise<void> {
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('X-Correlation-Id', request.id);
  });
}
