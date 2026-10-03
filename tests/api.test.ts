import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { digest, hashPassword } from '../apps/api/security';
import { emptyLog } from '../packages/shared/model';
let mf: Miniflare, db: D1Database;
const pepper = 'test-only-pepper-32-characters-long-never-production';
async function request(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie?: string,
  origin = 'http://localhost',
) {
  return mf.dispatchFetch(`http://localhost/api${path}`, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-FitTrio-Request': '1',
      'CF-Connecting-IP': '192.0.2.10',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function json(response: { json: () => Promise<unknown> }) {
  return (await response.json()) as Record<string, unknown>;
}
let alice: string, bob: string;
beforeAll(async () => {
  const bundle = await build({
    entryPoints: ['apps/api/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    external: ['node:*'],
  });
  mf = new Miniflare({
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-08-01',
    compatibilityFlags: ['nodejs_compat'],
    bindings: { ENVIRONMENT: 'development', PASSWORD_PEPPER: pepper },
    d1Databases: ['DB'],
  });
  db = await mf.getD1Database('DB');
  const migration = readFileSync('migrations/0001_initial.sql', 'utf8');
  for (const sql of migration
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
  for (const [id, email] of [
    ['alice', 'alice@example.com'],
    ['bob', 'bob@example.com'],
  ])
    await db
      .prepare('INSERT INTO users(id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)')
      .bind(id, email, id, hashPassword('correct-password-123', pepper), Date.now())
      .run();
  const a = await request('/auth/login', 'POST', {
    email: 'alice@example.com',
    password: 'correct-password-123',
  });
  expect(a.status).toBe(200);
  alice = a.headers.get('set-cookie')!.split(';')[0];
  const b = await request('/auth/login', 'POST', {
    email: 'bob@example.com',
    password: 'correct-password-123',
  });
  expect(b.status).toBe(200);
  bob = b.headers.get('set-cookie')!.split(';')[0];
}, 60000);
afterAll(async () => {
  await mf?.dispose();
});
describe('real Worker and D1 API', () => {
  it('requires authentication and rejects foreign origins', async () => {
    expect((await request('/data')).status).toBe(401);
    expect(
      (await request('/logs/2026-10-03', 'PUT', emptyLog(1800), alice, 'https://evil.example'))
        .status,
    ).toBe(403);
    const r = await request('/auth/login', 'POST', {
      email: 'alice@example.com',
      password: 'incorrect-password',
    });
    expect(r.status).toBe(401);
  });
  it('saves historical target and calculates diet without exposing other users', async () => {
    const log = { ...emptyLog(1800), calories: 1750, weight: 90, notes: 'Alice private' };
    expect((await request('/logs/2026-10-01', 'PUT', log, alice)).status).toBe(200);
    const a = await json(await request('/data', 'GET', undefined, alice));
    expect((a.logs as Array<{ diet: string }>)[0].diet).toBe('done');
    const b = await json(await request('/data', 'GET', undefined, bob));
    expect(b.logs).toEqual([]);
    expect(b.weights).toEqual([]);
    expect((await request('/logs/2026-02-30', 'PUT', log, alice)).status).toBe(400);
    expect(
      (await request('/logs/2026-10-01', 'PUT', { ...log, userId: 'bob' }, alice)).status,
    ).toBe(400);
  });
  it('upserts weights and scopes deletion to current user', async () => {
    expect(
      (await request('/weights', 'POST', { date: '2026-10-02', weight: 89 }, alice)).status,
    ).toBe(201);
    await request('/weights', 'POST', { date: '2026-10-02', weight: 88 }, alice);
    await request('/weights/2026-10-02', 'DELETE', {}, bob);
    const a = await json(await request('/weights', 'GET', undefined, alice));
    expect(a.weights).toEqual([
      { date: '2026-10-01', weight: 90 },
      { date: '2026-10-02', weight: 88 },
    ]);
  });
  it('creates exercises atomically and blocks another user from deleting the workout', async () => {
    const r = await request(
      '/workouts',
      'POST',
      {
        date: '2026-10-03',
        name: 'Push',
        duration: 45,
        notes: 'private',
        exercises: [{ name: 'Bench', sets: 3, reps: 8, weight: 60, unit: 'kg', notes: '' }],
      },
      alice,
    );
    expect(r.status).toBe(201);
    const { id } = await json(r);
    expect((await request(`/workouts/${id}`, 'DELETE', {}, bob)).status).toBe(404);
    const list = await json(await request('/workouts', 'GET', undefined, alice));
    expect((list.workouts as Array<{ exercises: unknown[] }>)[0].exercises).toHaveLength(1);
    await request(`/workouts/${id}`, 'DELETE', {}, alice);
    expect(
      (await db.prepare('SELECT count(*) AS n FROM workout_exercises').first<{ n: number }>())?.n,
    ).toBe(0);
  });
  it('keeps the group private by default and returns only opted-in fields', async () => {
    expect((await json(await request('/group', 'GET', undefined, bob))).people).toEqual([]);
    await db.prepare('UPDATE users SET share_activity=1 WHERE id=?').bind('alice').run();
    const r = await json(await request('/group', 'GET', undefined, bob));
    const person = (r.people as Array<Record<string, unknown>>)[0];
    expect(person.weightChange).toBeNull();
    expect(person).not.toHaveProperty('email');
    expect(person).not.toHaveProperty('notes');
    expect(person).not.toHaveProperty('calories');
  });
  it('requires a matching single-use invite and issues HTTP-only cookies', async () => {
    const token = 'valid-invite-token-at-least-20';
    await db
      .prepare('INSERT INTO invitations(token_hash,email,expires_at,created_at) VALUES (?,?,?,?)')
      .bind(await digest(token), 'carol@example.com', Date.now() + 60000, Date.now())
      .run();
    const body = {
      email: 'carol@example.com',
      password: 'strong-carol-password',
      name: 'Carol',
      invite: token,
    };
    expect(
      (await request('/auth/register', 'POST', { ...body, email: 'wrong@example.com' })).status,
    ).toBe(400);
    const r = await request('/auth/register', 'POST', body);
    expect(r.status).toBe(201);
    expect(r.headers.get('set-cookie')).toContain('HttpOnly');
    expect(r.headers.get('set-cookie')).toContain('SameSite=Strict');
    expect((await request('/auth/register', 'POST', body)).status).toBe(400);
  });
  it('invalidates sessions on logout and enforces expiry', async () => {
    const old = bob;
    expect((await request('/auth/logout', 'POST', {}, bob)).status).toBe(200);
    expect((await request('/data', 'GET', undefined, old)).status).toBe(401);
    await db.prepare('UPDATE sessions SET expires_at=0 WHERE user_id=?').bind('alice').run();
    expect((await request('/me', 'GET', undefined, alice)).status).toBe(401);
  });
  it('rate limits authentication attempts', async () => {
    let response: Awaited<ReturnType<typeof request>> | undefined;
    for (let i = 0; i < 25; i++)
      response = await request('/auth/login', 'POST', {
        email: 'none@example.com',
        password: 'wrong-password-123',
      });
    expect(response?.status).toBe(429);
  });
});
