/** Signed links for emails (no login needed), e.g. a guardian stopping weekly reports. */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Db } from './db.ts';
import { appSecret } from './db.ts';
import { config } from './config.ts';

const sign = (db: Db, purpose: string, id: string) => createHmac('sha256', appSecret(db)).update(`${purpose}:${id}`).digest('base64url').slice(0, 32);

export function verifySigned(db: Db, purpose: string, id: string, token: string): boolean {
  const a = Buffer.from(sign(db, purpose, id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubscribeUrl = (db: Db, learnerId: string) => `${config.publicUrl}/api/reports/unsubscribe?l=${encodeURIComponent(learnerId)}&t=${sign(db, 'unsub', learnerId)}`;
