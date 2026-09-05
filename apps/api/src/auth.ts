import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApplicationError, UserRole } from '../../../packages/domain/dist/index.js';

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  identityReference: string;
};

export interface AuthProvider {
  authenticate(request: FastifyRequest): Promise<AuthenticatedUser>;
}

/**
 * DevelopmentAuthProvider:
 * Extracts identity from development headers.
 * Marked as TBD — Hospital Decision Required until production IdP is integrated.
 */
export class DevelopmentAuthProvider implements AuthProvider {
  private readonly defaultPatientId: string;

  constructor(defaultPatientId = '00000000-0000-4000-8000-000000000011') {
    this.defaultPatientId = defaultPatientId;
  }

  async authenticate(request: FastifyRequest): Promise<AuthenticatedUser> {
    const headerValue = request.headers['x-patient-id'];
    const id = headerValue
      ? z.string().uuid().parse(headerValue)
      : this.defaultPatientId;

    const roleHeader = (request.headers['x-user-role'] as UserRole) ?? 'PATIENT';

    return {
      id,
      role: roleHeader,
      identityReference: `DEV-USER-${id.slice(0, 8)}`
    };
  }
}
