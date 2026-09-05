import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOLD_DURATION_SECONDS: z.coerce.number().int().min(30).max(3_600).default(300),
  AUTH_MODE: z.literal('development').default('development')
});

export type AppConfig = z.infer<typeof environmentSchema>;
export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => environmentSchema.parse(environment);
