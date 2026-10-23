import { resolve } from 'node:path';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file — environment variables or defaults apply.
}

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 5174),
  dev: env.NODE_ENV !== 'production',
  databasePath: resolve(env.DATABASE_PATH ?? './data/magubane.db'),
  clientDir: resolve(env.CLIENT_DIR ?? './dist/client'),
  sessionDays: 30,
  anthropicKey: env.ANTHROPIC_API_KEY?.trim() || null,
  anthropicBaseUrl: (env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, ''),
  tutorModel: env.TUTOR_MODEL?.trim() || 'claude-sonnet-5-5',
  tutorDailyLimit: Number(env.TUTOR_DAILY_LIMIT ?? 80),
};

/** The server's clock. Only the demo seeder moves it (to build realistic history); nothing else should. */
let clockOverride: Date | null = null;
export function now(): Date {
  return clockOverride ? new Date(clockOverride) : new Date();
}
export function setClock(d: Date | null): void {
  clockOverride = d;
}
