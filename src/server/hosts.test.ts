/**
 * The company site and Bonisa on one server: the site address serves the site, old Bonisa addresses on it move to
 * the app address with their cookies, and the API keeps working on both.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

const SITE = 'magubanelabs.co.za';
const APP = 'learn.magubanelabs.co.za';
let app: Server;
let port = 0;

before(async () => {
  process.env.SITE_HOST = SITE;
  process.env.PUBLIC_URL = `https://${APP}`;
  process.env.SITE_DIR = resolve('site');
  const { openDb } = await import('./db.ts');
  const { createApp } = await import('./app.ts');
  app = createApp(openDb(':memory:'));
  await new Promise<void>((r) => app.listen(0, r));
  port = (app.address() as AddressInfo).port;
});

after(() => app.close());

type Res = { status: number; headers: import('node:http').IncomingHttpHeaders; body: string };
function get(host: string, path: string, cookie?: string, method = 'GET'): Promise<Res> {
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers: { host, ...(cookie ? { cookie } : {}) } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => done({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on('error', fail);
    req.end();
  });
}
const cookiesSet = (r: Res) => (r.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]);

test('the site address serves the company site', async () => {
  const home = await get(SITE, '/');
  assert.equal(home.status, 200);
  assert.match(home.headers['content-type'] ?? '', /text\/html/);
  assert.match(home.body, /<title>Magubane Labs/);
  assert.match(String(home.headers['content-security-policy'] ?? ''), /script-src 'self'/, 'same security headers as the app');
  assert.equal((await get(SITE, '/site.js')).status, 200);
  const font = await get(SITE, '/fonts/InstrumentSans-Regular.woff');
  assert.equal(font.status, 200);
  assert.equal(font.headers['content-type'], 'font/woff');
  assert.equal((await get(SITE, '/', undefined, 'HEAD')).status, 200);
  assert.equal((await get(SITE, '/', undefined, 'POST')).status, 405);
});

test('www goes to the bare address', async () => {
  const r = await get(`www.${SITE}`, '/clients?x=1');
  assert.equal(r.status, 301);
  assert.equal(r.headers.location, `https://${SITE}/clients?x=1`);
});

test('old Bonisa addresses without cookies go straight to the app address', async () => {
  const r = await get(SITE, '/teach/classes/abc?tab=work');
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, `https://${APP}/teach/classes/abc?tab=work`);
  assert.equal(cookiesSet(r).length, 0);
  const open = await get(SITE, '/learn');
  assert.equal(open.headers.location, `https://${APP}/`, '"Sign in to Bonisa" opens the app home');
  const asset = await get(SITE, '/assets/main.js');
  assert.equal(asset.headers.location, `https://${APP}/assets/main.js`);
});

test('signed-in sessions and set-up Junior devices move with the person, once', async () => {
  const r = await get(SITE, '/junior', 'ml_session=sess-123; ml_device=dev-456; other=x');
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.location as string);
  assert.equal(loc.origin, `https://${APP}`);
  assert.equal(loc.pathname, '/api/handoff');
  assert.equal(loc.searchParams.get('next'), '/junior');
  assert.ok(!(r.headers.location as string).includes('sess-123') && !(r.headers.location as string).includes('dev-456'), 'cookies never appear in a URL');

  const landed = await get(APP, `${loc.pathname}${loc.search}`);
  assert.equal(landed.status, 302);
  assert.equal(landed.headers.location, '/junior');
  const set = landed.headers['set-cookie'] ?? [];
  assert.ok(set.some((c) => c.startsWith('ml_session=sess-123;') && /HttpOnly/.test(c) && /SameSite=Lax/.test(c)));
  assert.ok(set.some((c) => c.startsWith('ml_device=dev-456;') && /Max-Age=\d{8}/.test(c)), 'device cookie keeps its long life');

  const again = await get(APP, `${loc.pathname}${loc.search}`);
  assert.equal(again.status, 302);
  assert.equal(cookiesSet(again).length, 0, 'a handoff link works only once');
});

test('a device cookie alone is enough to carry, and unknown handoffs set nothing', async () => {
  const r = await get(SITE, '/learn', 'ml_device=only-device');
  const loc = new URL(r.headers.location as string);
  assert.equal(loc.searchParams.get('next'), '/');
  const landed = await get(APP, `${loc.pathname}${loc.search}`);
  assert.deepEqual(cookiesSet(landed), ['ml_device=only-device']);

  const bogus = await get(APP, '/api/handoff?t=not-a-token&next=%2Fhome');
  assert.equal(bogus.status, 302);
  assert.equal(bogus.headers.location, '/home');
  assert.equal(cookiesSet(bogus).length, 0);
});

test('handoff never redirects to another site', async () => {
  for (const next of ['//evil.example/x', '/\\evil.example', 'https://evil.example', '']) {
    const r = await get(APP, `/api/handoff?t=x&next=${encodeURIComponent(next)}`);
    assert.equal(r.headers.location, '/', `next=${next}`);
  }
});

test('nothing outside the site folder is served', async () => {
  for (const path of ['/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2f.env']) {
    const r = await get(SITE, path);
    assert.notEqual(r.status, 200, path);
    assert.ok(!r.body.includes('"name"'), path);
  }
});

test('the API still answers on the site address, so open tabs and emailed links keep working', async () => {
  const r = await get(SITE, '/api/health');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).ok, true);
});

test('the app address never redirects to the site', async () => {
  const r = await get(APP, '/home');
  assert.notEqual(r.status, 302);
  const other = await get('magubane-labs.onrender.com', '/learn');
  assert.notEqual(other.status, 302, 'Render’s own address keeps serving the app');
});
