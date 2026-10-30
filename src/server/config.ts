import { resolve } from 'node:path';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file — environment variables or defaults apply.
}

const env = process.env;
/** A setting's value, or undefined when it is missing or blank: `PUBLIC_URL=` in .env means "not set", not "empty". */
const setting = (name: string): string | undefined => env[name]?.trim() || undefined;

export const config = {
  port: Number(setting('PORT') ?? 5174),
  dev: env.NODE_ENV !== 'production',
  databasePath: resolve(setting('DATABASE_PATH') ?? './data/magubane.db'),
  clientDir: resolve(setting('CLIENT_DIR') ?? './dist/client'),
  sessionDays: 30,
  /** Anything that isn't a real key (blank, "none", a placeholder) means the tutor is off. */
  anthropicKey: /^sk-ant-/.test(env.ANTHROPIC_API_KEY?.trim() ?? '') ? (env.ANTHROPIC_API_KEY as string).trim() : null,
  anthropicBaseUrl: (setting('ANTHROPIC_BASE_URL') ?? 'https://api.anthropic.com').replace(/\/$/, ''),
  tutorModel: env.TUTOR_MODEL?.trim() || 'claude-haiku-5-5',
  tutorDailyLimit: Number(setting('TUTOR_DAILY_LIMIT') ?? 80),
  /** Site-wide cap on tutor messages per 24 hours: protects the API bill if sign-ups spike. */
  tutorGlobalDailyLimit: Number(setting('TUTOR_GLOBAL_DAILY_LIMIT') ?? 600),
  /** 'invite' (default in production): sign-up needs a code from INVITE_CODES. 'open' or 'closed' otherwise. */
  signupMode: (setting('SIGNUP_MODE') ?? (env.NODE_ENV === 'production' ? 'invite' : 'open')) as 'invite' | 'open' | 'closed',
  inviteCodes: (env.INVITE_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
  signupRatePerHour: Number(setting('SIGNUP_RATE_PER_HOUR') ?? 40),
  /** Behind a reverse proxy (Render, Fly, nginx): read the client IP from X-Forwarded-For. */
  trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  /** Shown on the privacy page for access and deletion requests. */
  contactEmail: env.CONTACT_EMAIL?.trim() || null,
  /** Codes that let someone create a teacher (educator) account. Never the same as learner invite codes. */
  educatorCodes: (env.EDUCATOR_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
  /** Public address of the site, for links in emails. Render sets RENDER_EXTERNAL_URL automatically. */
  publicUrl: (setting('PUBLIC_URL') ?? setting('RENDER_EXTERNAL_URL') ?? `http://localhost:${setting('PORT') ?? 5174}`).replace(/\/$/, ''),
  /** Email delivery: 'brevo' or 'resend' with EMAIL_API_KEY; anything else logs emails to the console instead. */
  email: {
    provider: (['brevo', 'resend'].includes(env.EMAIL_PROVIDER?.trim().toLowerCase() ?? '') && env.EMAIL_API_KEY?.trim() ? env.EMAIL_PROVIDER!.trim().toLowerCase() : 'log') as 'brevo' | 'resend' | 'log',
    apiKey: env.EMAIL_API_KEY?.trim() || null,
    from: env.EMAIL_FROM?.trim() || 'no-reply@magubanelabs.local',
    fromName: env.EMAIL_FROM_NAME?.trim() || 'Magubane Labs',
    /** Tests point this at a local fake. */
    apiBase: env.EMAIL_API_BASE?.replace(/\/$/, '') || null,
  },
  /** Weekly progress reports: day 0 = Sunday, hour in South African time. */
  reportDay: Number(setting('REPORT_DAY') ?? 0),
  reportHour: Number(setting('REPORT_HOUR') ?? 17),
  reportsEnabled: env.REPORTS_ENABLED !== '0',
};

/** The server's clock. Only the demo seeder moves it (to build realistic history); nothing else should. */
let clockOverride: Date | null = null;
export function now(): Date {
  return clockOverride ? new Date(clockOverride) : new Date();
}
export function setClock(d: Date | null): void {
  clockOverride = d;
}
