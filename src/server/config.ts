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
  /** Anything that isn't a real key (blank, "none", a placeholder) means the tutor is off. */
  anthropicKey: /^sk-ant-/.test(env.ANTHROPIC_API_KEY?.trim() ?? '') ? (env.ANTHROPIC_API_KEY as string).trim() : null,
  anthropicBaseUrl: (env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, ''),
  tutorModel: env.TUTOR_MODEL?.trim() || 'claude-haiku-5-5',
  tutorDailyLimit: Number(env.TUTOR_DAILY_LIMIT ?? 80),
  /** Site-wide cap on tutor messages per 24 hours: protects the API bill if sign-ups spike. */
  tutorGlobalDailyLimit: Number(env.TUTOR_GLOBAL_DAILY_LIMIT ?? 600),
  /** 'invite' (default in production): sign-up needs a code from INVITE_CODES. 'open' or 'closed' otherwise. */
  signupMode: (env.SIGNUP_MODE ?? (env.NODE_ENV === 'production' ? 'invite' : 'open')) as 'invite' | 'open' | 'closed',
  inviteCodes: (env.INVITE_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
  signupRatePerHour: Number(env.SIGNUP_RATE_PER_HOUR ?? 40),
  /** Behind a reverse proxy (Render, Fly, nginx): read the client IP from X-Forwarded-For. */
  trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  /** Shown on the privacy page for access and deletion requests. */
  contactEmail: env.CONTACT_EMAIL?.trim() || null,
};

/** The server's clock. Only the demo seeder moves it (to build realistic history); nothing else should. */
let clockOverride: Date | null = null;
export function now(): Date {
  return clockOverride ? new Date(clockOverride) : new Date();
}
export function setClock(d: Date | null): void {
  clockOverride = d;
}
