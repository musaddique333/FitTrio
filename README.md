# FitTrio

**Consistency, tracked.** A private fitness accountability app for one small circle of friends.

Daily gym/cardio/diet check-ins, a monthly calendar, workout journals with exercises, weight charts with calendar-based moving averages, weekly/monthly analytics, optional group accountability, and individual privacy controls. Mobile bottom navigation, light/dark/system themes, and installable PWA metadata are included.

## Quick start

Requires Node.js **22.12+**, npm, and a modern browser. No Cloudflare account is needed locally.

```bash
git clone https://github.com/musaddique333/FitTrio.git
cd FitTrio
npm ci
npm run setup
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:5173**. API: http://127.0.0.1:8787. From the ZIP, unzip, enter `FitTrio`, and start at `npm ci`.

Development-only logins:

| Email               | Password           |
| ------------------- | ------------------ |
| alex@fittrio.local  | FitTrio-Demo-2026! |
| jamie@fittrio.local | FitTrio-Demo-2026! |
| sam@fittrio.local   | FitTrio-Demo-2026! |

The seed creates three fictional users and 30 days of local history. It never accepts `--remote`. Never seed production or reuse these passwords there.

## Architecture

One **Cloudflare Worker** serves the React app as static assets and routes `/api/*` to Hono. D1 stores relational data through Drizzle. A single origin keeps session cookies, deployment, and CSRF checks simple; no separate Pages project or CORS configuration is needed.

- React 19, TypeScript strict mode, Vite, Tailwind 4, Lucide, Recharts, Sonner
- Hono, Drizzle ORM, Zod, Cloudflare D1
- Scrypt password hashing (`N=16384, r=8, p=5`), random per-password salts, external pepper
- Seven-day sessions: only token hashes in D1; production `__Host-` cookies are Secure, HttpOnly, SameSite=Strict
- Invite-only registration with email-bound, expiring, one-use invitation codes
- Atomic D1 writes; ownership checks; origin/header checks; auth rate limiting; security headers
- Dates are calendar dates in each profile’s IANA timezone; timestamps use UTC epoch milliseconds
- Weights stored in kg; lb is an input/display preference. Exercise units remain as recorded.

**Hosting caveat:** strong scrypt authentication takes substantially more CPU than Cloudflare Workers Free’s documented 10ms budget. Budget for **Workers Paid (currently starting at about US$5/month)** unless the production authentication probe demonstrates adequate behavior on your account. We do not lower password-hashing strength to fit the free limit. Deployment validation checks this explicitly. No automatic billing upgrade is performed.

## Project layout

```text
apps/api/             Hono API and security
apps/web/             React interface and public PWA assets
packages/db/          Drizzle schema
packages/shared/      Validation, types, deterministic analytics
migrations/           Versioned D1 SQL
scripts/              Setup, invites, seed, deployment, ZIP
tests/                Workerd/D1 tests, analytics, browser flows
docs/                 Deployment, security, and verification notes
.github/workflows/    Validation followed by main-branch deployment
```

## Configuration

`npm run setup` creates `.dev.vars` with `ENVIRONMENT=development` and a random `PASSWORD_PEPPER`. Preserve the pepper: changing it invalidates existing password hashes. `.env.example` documents all settings. No `.env` is consumed by the Worker.

Production uses `ENVIRONMENT=production` in `wrangler.jsonc` and `PASSWORD_PEPPER` as a Worker secret. The deploy script generates the pepper once if absent and never prints it. GitHub stores the Cloudflare API token as a secret, and account ID as a secret or variable. D1’s database ID is configuration, not a secret.

The checked-in D1 ID is a placeholder. Local Wrangler uses a local database. Production CI discovers or creates `fittrio-db` and replaces that ID only inside the runner.

## Commands and checks

```bash
npm run check             # ESLint, TypeScript, 13 API/analytics tests, build
npx playwright install --with-deps chromium
npm run setup
npm run db:migrate
npm run db:seed
npm run test:e2e          # Auth, forms, settings, routes, responsive overflow
npm run format
npm run package          # ZIP of committed Git-tracked files
```

API tests run the actual bundled Worker against ephemeral D1 in Miniflare. Browser checks use seeded local data and cover 320, 360, 375, 390, 414, 430, 768, and 1280px widths. Chromium automation does not replace testing real iPhone Safari or Android Chrome.

Charts are loaded separately from the initial app. Private API responses use `no-store`; the service worker deliberately does not cache private data. The PWA is installable over HTTPS but offers no offline logging or notifications.

## Screenshots

Browser verification writes `artifacts/dashboard-desktop.png` and `artifacts/dashboard-mobile.png`. CI uploads them in the browser-test-results artifact. Add approved screenshots here after verification.

## Deployment and accounts

Follow [docs/deployment.md](docs/deployment.md) for exact Cloudflare/GitHub setup, migrations, production secrets, invites, backups, and troubleshooting. **Production contains no demo users.** Your first user needs an invite created by an authenticated administrator CLI.

On each push to **main**, GitHub Actions runs lint/typecheck/tests/build and browser checks. Only successful validation permits deployment. Pull requests validate without deployment. The Cloudflare token needs Workers deployment and D1 edit permissions, scoped to the selected account.

## Privacy and security

Each user owns their logs, weights, exercises and settings. Sharing is off by default for new accounts. Opting into the circle reveals only name, current local-day activity, and streak; weight change requires another opt-in. Calories, exact weights, notes and photo URLs never appear in the shared API. See [docs/security.md](docs/security.md).

Photo links must use HTTPS and open on the host; external images are not silently loaded. Host sharing permissions still control who can open a link.

## Analytics definitions

Missing dates count as incomplete; rest opportunities are excluded. A successful day has all three objectives done/rest and at least one done. Today’s unfinished check-in does not break yesterday’s streak until the day is over. Weekly totals use Monday through today; monthly totals use first-of-month through today. Calorie averages exclude missing values. Weight changes compare first/last measurements within the period; the moving average uses available measurements in the previous seven calendar days.

## Cost planning

For 3, 10, or 100 lightly active users, expect roughly **US$5/month starting Workers Paid cost**, with D1 often inside included quotas. This is a planning estimate, not a billing guarantee. Free static asset serving and D1 allowances help keep costs low, but authentication CPU is the constraint. Monitor Worker request count/CPU, D1 rows read/written/storage, and retained logs. Current references: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

## Known V1 limits and next steps

One circle per deployment. No email delivery, self-service forgotten-password reset, editing existing workouts, file uploads, offline writes, or automatic backups. Re-enter a workout after deleting it to correct it. Daily logs and weigh-ins are editable. Admin recovery is documented; export your personal JSON in Settings.

Future additions: R2 uploads with private object keys and signed access; workout templates; dedicated memberships for multiple groups; reminders/push; Health Connect/Apple Health import; opt-in email reports; and optional AI food estimation. These are intentionally not required by V1.
