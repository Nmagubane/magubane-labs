/**
 * One server, two addresses.
 *
 * - The app host (PUBLIC_URL, e.g. learn.magubanelabs.co.za) serves Bonisa, as before.
 * - The site host (SITE_HOST, e.g. magubanelabs.co.za) serves the Magubane Labs company site from SITE_DIR.
 *
 * Bonisa used to live on the site host, so people have bookmarks, emails and set-up Junior devices that point there.
 * Any page path on the site host that isn't a site file is sent to the app host. If the browser still holds Bonisa's
 * cookies for the old address (a signed-in session, or a Junior device set up by an adult), they travel with it through
 * a one-time handoff, so nobody is signed out and no child's picture sign-in stops working.
 *
 * The API stays available on both hosts, so tabs already open on the old address and links in emails already sent keep working.
 * Without SITE_HOST the server behaves exactly as it always has.
 */
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { config } from './config.ts';

/** Where the app host sends the browser to collect handed-over cookies. Lives under /api so both hosts can answer it. */
export const HANDOFF_PATH = '/api/handoff';
/** A short path the company site links to for "Open Bonisa": it goes through the handoff like any other old app path. */
export const OPEN_APP_PATH = '/learn';
const HANDOFF_TTL_MS = 2 * 60 * 1000;

const appOrigin = new URL(config.publicUrl).origin;
const appHost = new URL(config.publicUrl).host.toLowerCase();
const siteHost = config.siteHost;

/** The site is only served when it has its own address, different from the app's. Anything else would loop. */
export const siteEnabled = Boolean(siteHost && appHost !== siteHost && appHost !== `www.${siteHost}`);
if (siteHost && !siteEnabled) console.warn(`[hosts] SITE_HOST (${siteHost}) is the same address as PUBLIC_URL (${config.publicUrl}). The company site is off.`);

export function requestHost(req: IncomingMessage): string {
  return (req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
}

export function isSiteRequest(req: IncomingMessage): boolean {
  if (!siteEnabled) return false;
  const host = requestHost(req);
  return host === siteHost || host === `www.${siteHost}`;
}

type Carried = { session?: string; device?: string };
const pending = new Map<string, Carried & { expires: number }>();

function createHandoff(carried: Carried): string {
  const nowMs = Date.now();
  for (const [k, v] of pending) if (v.expires < nowMs) pending.delete(k);
  const token = randomBytes(32).toString('base64url');
  pending.set(token, { ...carried, expires: nowMs + HANDOFF_TTL_MS });
  return token;
}

/** One use only. Unknown or expired tokens return null, and the person simply signs in again. */
export function takeHandoff(token: string | null): Carried | null {
  if (!token) return null;
  const found = pending.get(token);
  if (!found) return null;
  pending.delete(token);
  if (found.expires < Date.now()) return null;
  return { ...(found.session ? { session: found.session } : {}), ...(found.device ? { device: found.device } : {}) };
}

/** Only same-site paths: never "//evil.example" or "/\evil.example", which browsers treat as another host. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

const SITE_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

function siteFile(pathname: string): string | null {
  const root = resolve(config.siteDir);
  let rel: string;
  try {
    rel = pathname === '/' ? 'index.html' : normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  } catch {
    return null;
  }
  const file = join(root, rel);
  const inside = relative(root, file);
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) return null;
  if (!existsSync(file) || statSync(file).isDirectory()) return null;
  return file;
}

/**
 * Handle a page request on the site host: a site file, or a redirect to Bonisa on the app host.
 * `cookies` are the request's cookies; `names` says which ones belong to Bonisa.
 */
export function handleSiteRequest(req: IncomingMessage, res: ServerResponse, url: URL, cookies: Record<string, string>, names: { session: string; device: string }): void {
  const host = requestHost(req);
  if (host === `www.${siteHost}`) {
    res.writeHead(301, { location: `https://${siteHost}${url.pathname}${url.search}`, 'cache-control': 'no-store' }).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain' }).end('Method not allowed');
    return;
  }
  const file = siteFile(url.pathname);
  if (file) {
    const ext = extname(file);
    res.writeHead(200, {
      'content-type': SITE_MIME[ext] ?? 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : ext === '.woff' || ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
    return;
  }
  // Not a site page: it's an old Bonisa address. Send it to the app host, carrying Bonisa's cookies if there are any.
  const next = url.pathname === OPEN_APP_PATH ? '/' : safeNext(`${url.pathname}${url.search}`);
  const carried: Carried = {
    ...(cookies[names.session] ? { session: cookies[names.session] } : {}),
    ...(cookies[names.device] ? { device: cookies[names.device] } : {}),
  };
  const location =
    carried.session || carried.device
      ? `${appOrigin}${HANDOFF_PATH}?t=${createHandoff(carried)}&next=${encodeURIComponent(next)}`
      : `${appOrigin}${next}`;
  res.writeHead(302, { location, 'cache-control': 'no-store' }).end();
}
