import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '@slotsure/domain';

export function registerErrorHandler(app: FastifyInstance): void {
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
}
