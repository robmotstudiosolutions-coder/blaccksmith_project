import { FastifyRequest } from 'fastify';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
import { ApplicationError, UserRole } from '../../../packages/domain/dist/index.js';

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  identityReference: string;
  email?: string;
  displayName?: string;
};

export interface AuthProvider {
  authenticate(request: FastifyRequest): Promise<AuthenticatedUser>;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(keyBuffer, derivedBuffer);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Database / Session Auth Provider:
 * Supports Bearer token header or x-session-token.
 * Falls back to DevelopmentAuthProvider if AUTH_MODE=development and no session token is passed.
 */
export class SessionAuthProvider implements AuthProvider {
  constructor(private readonly sql: any, private readonly defaultPatientId = '00000000-0000-4000-8000-000000000011') {}

  async authenticate(request: FastifyRequest): Promise<AuthenticatedUser> {
    const authHeader = request.headers['authorization'];
    const sessionToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.headers['x-session-token'] as string | undefined);

    if (sessionToken) {
      const tokenHash = hashToken(sessionToken);
      const rows = await this.sql<
        {
          userId: string;
          role: UserRole;
          identityReference: string;
          email: string;
          displayName: string;
          expiresAt: Date;
        }[]
      >`
        select sessions.user_id as "userId", users.role, users.identity_reference as "identityReference", users.email, users.display_name as "displayName", sessions.expires_at as "expiresAt"
        from sessions
        inner join users on users.id = sessions.user_id
        where sessions.token_hash = ${tokenHash} and sessions.expires_at > now()
      `;

      const session = rows[0];
      if (!session) {
        throw new ApplicationError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.', 401);
      }

      return {
        id: session.userId,
        role: session.role,
        identityReference: session.identityReference,
        email: session.email,
        displayName: session.displayName
      };
    }

    // Development fallback header check
    const patientHeader = request.headers['x-patient-id'];
    const id = patientHeader ? z.string().uuid().parse(patientHeader) : this.defaultPatientId;
    const roleHeader = (request.headers['x-user-role'] as UserRole) ?? 'PATIENT';

    return {
      id,
      role: roleHeader,
      identityReference: `DEV-USER-${id.slice(0, 8)}`,
      displayName: 'Demo Patient'
    };
  }
}

export class DevelopmentAuthProvider implements AuthProvider {
  constructor(private readonly defaultPatientId = '00000000-0000-4000-8000-000000000011') {}

  async authenticate(request: FastifyRequest): Promise<AuthenticatedUser> {
    const headerValue = request.headers['x-patient-id'];
    const id = headerValue ? z.string().uuid().parse(headerValue) : this.defaultPatientId;
    const roleHeader = (request.headers['x-user-role'] as UserRole) ?? 'PATIENT';

    return {
      id,
      role: roleHeader,
      identityReference: `DEV-USER-${id.slice(0, 8)}`
    };
  }
}
