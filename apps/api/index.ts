import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gte, lte, asc, desc } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import * as schema from '../../packages/db/schema';
import {
  credentialsSchema,
  registerSchema,
  logSchema,
  workoutSchema,
  profileSchema,
  dateSchema,
  type DailyLog,
  type User,
  type Workout,
} from '../../packages/shared/model';
import { todayIn, weekStart, addDays, summarize, streak } from '../../packages/shared/analytics';
import { digest, randomToken, hashPassword, verifyPassword } from './security';
export type Env = { DB: D1Database; ASSETS: Fetcher; ENVIRONMENT: string; PASSWORD_PEPPER: string };
type Variables = { user: User };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
type Ctx = Context<{ Bindings: Env; Variables: Variables }>;
const database = (c: Ctx) => drizzle(c.env.DB);
const now = () => Date.now();
const publicUser = (row: typeof schema.users.$inferSelect): User => {
  const { passwordHash: _hash, ...user } = row;
  void _hash;
  return user;
};
const cookieName = (c: Ctx) =>
  c.env.ENVIRONMENT === 'development' ? 'fittrio_session' : '__Host-fittrio_session';
const cookieOptions = (c: Ctx) => ({
  httpOnly: true,
  secure: c.env.ENVIRONMENT !== 'development',
  sameSite: 'Strict' as const,
  path: '/',
  maxAge: 7 * 86400,
});
const fail = (status: 400 | 401 | 403 | 404 | 409 | 429, message: string): never => {
  throw new HTTPException(status, { message });
};
async function input<T extends z.ZodTypeAny>(c: Ctx, validator: T): Promise<z.infer<T>> {
  try {
    return validator.parse(await c.req.json());
  } catch (err) {
    if (err instanceof SyntaxError) fail(400, 'Send valid JSON.');
    throw err;
  }
}
app.use(
  '/api/*',
  secureHeaders(),
  bodyLimit({
    maxSize: 32768,
    onError: (c) => c.json({ error: 'This request is too large.' }, 413),
  }),
);
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    const expected = new URL(c.req.url).origin;
    const local =
      c.env.ENVIRONMENT === 'development' &&
      [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8787',
        'http://127.0.0.1:8787',
      ].includes(origin ?? '');
    if (!origin || (origin !== expected && !local) || c.req.header('X-FitTrio-Request') !== '1')
      fail(403, 'Request origin could not be verified.');
    if (!c.req.header('Content-Type')?.startsWith('application/json'))
      fail(400, 'Send JSON with Content-Type application/json.');
  }
  await next();
});
app.onError((err, c) => {
  if (err instanceof ZodError)
    return c.json({ error: err.issues[0]?.message ?? 'Check the form values.' }, 400);
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  // Do not log bodies, passwords, private records, or database exception details.
  console.error(
    JSON.stringify({
      event: 'request_failed',
      path: c.req.path,
      method: c.req.method,
      errorType: err.name,
    }),
  );
  return c.json({ error: 'Something went wrong. Please try again.' }, 500);
});
app.get('/api/health', (c) => c.json({ ok: true, name: 'FitTrio' }));
async function limit(c: Ctx, email?: string) {
  const timestamp = now();
  const rawKeys = email
    ? [`email:${email}`]
    : [`ip:${c.req.header('CF-Connecting-IP') ?? 'local'}`];
  for (const raw of rawKeys) {
    const key = await digest(raw);
    const row = await c.env.DB.prepare(
      'INSERT INTO auth_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count',
    )
      .bind(key, timestamp + 15 * 60000, timestamp, timestamp, timestamp + 15 * 60000)
      .first<{ count: number }>();
    if ((row?.count ?? 21) > 20) {
      c.header('Retry-After', '900');
      fail(429, 'Too many attempts. Try again in 15 minutes.');
    }
  }
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM auth_limits WHERE expires_at<?').bind(timestamp),
    c.env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(timestamp),
  ]);
}
async function openSession(c: Ctx, userId: string) {
  const token = randomToken();
  await database(c)
    .insert(schema.sessions)
    .values({ tokenHash: await digest(token), userId, expiresAt: now() + 7 * 86400000 });
  setCookie(c, cookieName(c), token, cookieOptions(c));
}
app.post('/api/auth/login', async (c) => {
  await limit(c);
  const data = await input(c, credentialsSchema);
  await limit(c, data.email);
  const [user] = await database(c)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .limit(1);
  // Same expensive work for unknown emails to reduce enumeration through timing.
  const dummy =
    'scrypt:16384:8:5:0000000000000000000000000000000000000000000000000000000000000000:' +
    '0'.repeat(64);
  if (!verifyPassword(data.password, user?.passwordHash ?? dummy, c.env.PASSWORD_PEPPER) || !user)
    fail(401, 'Email or password is incorrect.');
  await openSession(c, user.id);
  return c.json({ user: publicUser(user) });
});
app.post('/api/auth/register', async (c) => {
  await limit(c);
  const data = await input(c, registerSchema);
  await limit(c, data.email);
  const id = crypto.randomUUID(),
    tokenHash = await digest(data.invite),
    timestamp = now(),
    passwordHash = hashPassword(data.password, c.env.PASSWORD_PEPPER);
  try {
    const result = await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO users (id,email,name,password_hash,created_at) SELECT ?,?,?,?,? FROM invitations WHERE token_hash=? AND email=? AND used_by IS NULL AND expires_at>?',
      ).bind(id, data.email, data.name, passwordHash, timestamp, tokenHash, data.email, timestamp),
      c.env.DB.prepare(
        'UPDATE invitations SET used_by=? WHERE token_hash=? AND used_by IS NULL AND EXISTS(SELECT 1 FROM users WHERE id=?)',
      ).bind(id, tokenHash, id),
    ]);
    if (result[0].meta.changes !== 1)
      fail(400, 'This invite is invalid, expired, already used, or for another email.');
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    fail(409, 'Unable to create this account. Check the invite or sign in.');
  }
  const [user] = await database(c).select().from(schema.users).where(eq(schema.users.id, id));
  await openSession(c, id);
  return c.json({ user: publicUser(user) }, 201);
});
app.use('/api/*', async (c, next) => {
  const token = getCookie(c, cookieName(c));
  if (!token) fail(401, 'Please sign in to continue.');
  const [row] = await database(c)
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(
      and(
        eq(schema.sessions.tokenHash, await digest(token!)),
        gte(schema.sessions.expiresAt, now()),
      ),
    )
    .limit(1);
  if (!row) fail(401, 'Your session expired. Please sign in again.');
  c.set('user', publicUser(row.user));
  await next();
});
app.post('/api/auth/logout', async (c) => {
  const token = getCookie(c, cookieName(c));
  if (token)
    await database(c)
      .delete(schema.sessions)
      .where(eq(schema.sessions.tokenHash, await digest(token)));
  deleteCookie(c, cookieName(c), cookieOptions(c));
  return c.json({ ok: true });
});
app.get('/api/me', (c) => c.json({ user: c.get('user') }));
app.put('/api/me', async (c) => {
  const data = await input(c, profileSchema);
  const [user] = await database(c)
    .update(schema.users)
    .set(data)
    .where(eq(schema.users.id, c.get('user').id))
    .returning();
  return c.json({ user: publicUser(user) });
});
app.post('/api/auth/password', async (c) => {
  await limit(c);
  const data = await input(
    c,
    z
      .object({
        currentPassword: z.string().min(1).max(128),
        password: z.string().min(12).max(128),
      })
      .strict(),
  );
  const db = database(c),
    id = c.get('user').id;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!verifyPassword(data.currentPassword, user.passwordHash, c.env.PASSWORD_PEPPER))
    fail(401, 'Current password is incorrect.');
  await db.batch([
    db
      .update(schema.users)
      .set({ passwordHash: hashPassword(data.password, c.env.PASSWORD_PEPPER) })
      .where(eq(schema.users.id, id)),
    db.delete(schema.sessions).where(eq(schema.sessions.userId, id)),
  ]);
  await openSession(c, id);
  return c.json({ ok: true });
});
async function snapshot(c: Ctx) {
  const db = database(c),
    user = c.get('user'),
    id = user.id;
  const [logs, weights, workoutRows, exerciseRows] = await Promise.all([
    db
      .select()
      .from(schema.dailyLogs)
      .where(eq(schema.dailyLogs.userId, id))
      .orderBy(asc(schema.dailyLogs.date)),
    db
      .select({ date: schema.weightLogs.date, weight: schema.weightLogs.weight })
      .from(schema.weightLogs)
      .where(eq(schema.weightLogs.userId, id))
      .orderBy(asc(schema.weightLogs.date)),
    db
      .select()
      .from(schema.workouts)
      .where(eq(schema.workouts.userId, id))
      .orderBy(desc(schema.workouts.date)),
    db
      .select({ exercise: schema.exercises })
      .from(schema.exercises)
      .innerJoin(schema.workouts, eq(schema.workouts.id, schema.exercises.workoutId))
      .where(eq(schema.workouts.userId, id))
      .orderBy(asc(schema.exercises.position)),
  ]);
  const weightMap = new Map(weights.map((w) => [w.date, w.weight]));
  const daily: DailyLog[] = logs.map((l) => ({ ...l, weight: weightMap.get(l.date) ?? null }));
  const workouts: Workout[] = workoutRows.map((w) => ({
    ...w,
    exercises: exerciseRows.filter((e) => e.exercise.workoutId === w.id).map((e) => e.exercise),
  }));
  const today = todayIn(user.timezone);
  return { user, today, logs: daily, weights, workouts, streak: streak(daily, today) };
}
app.get('/api/data', async (c) => c.json(await snapshot(c)));
app.get('/api/dashboard', async (c) => {
  const data = await snapshot(c);
  return c.json({
    ...data,
    weekly: summarize(data.logs, data.weights, data.workouts, weekStart(data.today), data.today),
  });
});
app.get('/api/analytics/:period', async (c) => {
  const period = z.enum(['weekly', 'monthly']).parse(c.req.param('period'));
  const data = await snapshot(c);
  const from = period === 'weekly' ? weekStart(data.today) : data.today.slice(0, 7) + '-01';
  return c.json(summarize(data.logs, data.weights, data.workouts, from, data.today));
});
app.get('/api/logs/:date', async (c) => {
  const date = dateSchema.parse(c.req.param('date'));
  const data = await snapshot(c);
  return c.json({
    log: data.logs.find((l) => l.date === date) ?? null,
    weight: data.weights.find((w) => w.date === date)?.weight ?? null,
  });
});
app.put('/api/logs/:date', async (c) => {
  const date = dateSchema.parse(c.req.param('date')),
    data = await input(c, logSchema),
    id = c.get('user').id,
    db = database(c);
  const { weight, ...fields } = data;
  const row = {
    ...fields,
    diet:
      data.autoDiet && data.calories !== null
        ? data.calories <= data.calorieTarget
          ? ('done' as const)
          : ('missed' as const)
        : data.diet,
    userId: id,
    date,
    updatedAt: now(),
  };
  const weightQuery =
    weight === null
      ? db
          .delete(schema.weightLogs)
          .where(and(eq(schema.weightLogs.userId, id), eq(schema.weightLogs.date, date)))
      : db
          .insert(schema.weightLogs)
          .values({ userId: id, date, weight, updatedAt: now() })
          .onConflictDoUpdate({
            target: [schema.weightLogs.userId, schema.weightLogs.date],
            set: { weight, updatedAt: now() },
          });
  await db.batch([
    db
      .insert(schema.dailyLogs)
      .values(row)
      .onConflictDoUpdate({ target: [schema.dailyLogs.userId, schema.dailyLogs.date], set: row }),
    weightQuery,
  ]);
  return c.json({ log: { ...row, weight } });
});
app.get('/api/weights', async (c) => c.json({ weights: (await snapshot(c)).weights }));
app.post('/api/weights', async (c) => {
  const data = await input(
    c,
    z.object({ date: dateSchema, weight: z.number().finite().min(20).max(500) }).strict(),
  );
  await database(c)
    .insert(schema.weightLogs)
    .values({ ...data, userId: c.get('user').id, updatedAt: now() })
    .onConflictDoUpdate({
      target: [schema.weightLogs.userId, schema.weightLogs.date],
      set: { weight: data.weight, updatedAt: now() },
    });
  return c.json({ ok: true }, 201);
});
app.delete('/api/weights/:date', async (c) => {
  const date = dateSchema.parse(c.req.param('date'));
  await database(c)
    .delete(schema.weightLogs)
    .where(and(eq(schema.weightLogs.userId, c.get('user').id), eq(schema.weightLogs.date, date)));
  return c.json({ ok: true });
});
app.get('/api/workouts', async (c) => c.json({ workouts: (await snapshot(c)).workouts }));
app.post('/api/workouts', async (c) => {
  const data = await input(c, workoutSchema),
    db = database(c),
    id = crypto.randomUUID();
  const { exercises, ...fields } = data;
  await db.batch([
    db
      .insert(schema.workouts)
      .values({ ...fields, id, userId: c.get('user').id, createdAt: now() }),
    db
      .insert(schema.exercises)
      .values(
        exercises.map((e, position) => ({
          ...e,
          id: crypto.randomUUID(),
          workoutId: id,
          position,
        })),
      ),
  ]);
  return c.json({ id }, 201);
});
app.delete('/api/workouts/:id', async (c) => {
  const id = z.string().min(1).max(128).parse(c.req.param('id'));
  const deleted = await database(c)
    .delete(schema.workouts)
    .where(and(eq(schema.workouts.id, id), eq(schema.workouts.userId, c.get('user').id)))
    .returning({ id: schema.workouts.id });
  if (!deleted.length) fail(404, 'Workout not found.');
  return c.json({ ok: true });
});
app.get('/api/group', async (c) => {
  const db = database(c);
  const people = await db.select().from(schema.users).where(eq(schema.users.shareActivity, true));
  const result = await Promise.all(
    people.map(async (p) => {
      const date = todayIn(p.timezone);
      const logs = await db
        .select()
        .from(schema.dailyLogs)
        .where(
          and(
            eq(schema.dailyLogs.userId, p.id),
            gte(schema.dailyLogs.date, addDays(date, -366)),
            lte(schema.dailyLogs.date, date),
          ),
        )
        .orderBy(asc(schema.dailyLogs.date));
      const log = logs.find((l) => l.date === date);
      const daily = logs.map((l) => ({ ...l, weight: null }));
      let weightChange: number | null = null;
      if (p.shareWeight) {
        const weights = await db
          .select()
          .from(schema.weightLogs)
          .where(
            and(
              eq(schema.weightLogs.userId, p.id),
              gte(schema.weightLogs.date, addDays(date, -29)),
              lte(schema.weightLogs.date, date),
            ),
          )
          .orderBy(asc(schema.weightLogs.date));
        if (weights.length >= 2) weightChange = weights.at(-1)!.weight - weights[0].weight;
      }
      return {
        id: p.id,
        name: p.name,
        date,
        gym: log?.gym ?? 'pending',
        cardio: log?.cardio ?? 'pending',
        diet: log?.diet ?? 'pending',
        streak: streak(daily, date),
        weightChange,
      };
    }),
  );
  return c.json({ people: result });
});
app.notFound((c) => c.json({ error: 'Not found.' }, 404));
export default app;
