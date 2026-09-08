import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '@slotsure/domain';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const isApplicationError =
      error instanceof ApplicationError ||
      (Boolean(error) && typeof error === 'object' && ((error as any).name === 'ApplicationError' || (Boolean((error as any).code) && typeof (error as any).statusCode === 'number')));

    if (isApplicationError) {
      const appErr = error as ApplicationError;
      return reply.status(appErr.statusCode || 500).send({
        code: appErr.code || 'INTERNAL_ERROR',
        message: appErr.message,
        retryable: appErr.retryable ?? false,
        correlationId: request.id,
        ...appErr.details
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
