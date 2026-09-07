import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ApplicationError } from '@slotsure/domain';
import { AuthProvider, hashPassword, verifyPassword, hashToken } from '../auth.js';

export async function registerAuthRoutes(
  app: FastifyInstance,
  options: {
    sql: any;
    authProvider: AuthProvider;
  }
): Promise<void> {
  const { sql, authProvider } = options;

  app.post('/v1/auth/register', async (request: FastifyRequest) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(2)
      })
      .parse(request.body);

    if (sql) {
      const existing = await sql<{ id: string }[]>`select id from users where email = ${body.email}`;
      if (existing[0]) {
        throw new ApplicationError('USER_ALREADY_EXISTS', 'An account with that email already exists.', 409);
      }

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

  app.post('/v1/auth/login', async (request: FastifyRequest) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string()
      })
      .parse(request.body);

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

  app.get('/v1/auth/me', async (request: FastifyRequest) => {
    const user = await authProvider.authenticate(request);
    return { user };
  });
}
