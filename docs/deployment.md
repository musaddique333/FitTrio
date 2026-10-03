# Deploy FitTrio to Cloudflare

The frontend and API share one Worker and one D1 database. A Cloudflare-provided `workers.dev` URL is sufficient; no domain, Pages project, R2, or email provider is needed.

## One-time GitHub configuration

1. Create/sign into your Cloudflare account and enable Workers. If the free plan cannot pass the authentication CPU probe, enable Workers Paid yourself; the deployment does not change billing.
2. In Cloudflare API Tokens create an **Edit Cloudflare Workers** token. Add **Account → D1 → Edit**. Include Account Settings Read if the template does not include account discovery. Restrict it to the selected account; do not use a Global API Key.
3. In GitHub FitTrio → Settings → Secrets and variables → Actions → Secrets, add `CLOUDFLARE_API_TOKEN`.
4. Add `CLOUDFLARE_ACCOUNT_ID` as a repository secret or variable. The workflow accepts either.
5. Push to `main`, or open Actions → Validate and deploy FitTrio → Run workflow on main.
6. Validation runs first, including seeded browser tests. Deployment creates `fittrio-db` if absent, applies initial migrations only to a newly created database, deploys the Worker/static assets, and creates `PASSWORD_PEPPER` only if absent.
7. Read the production URL and database ID in the deployment job summary. A health check and incorrect-password authentication probe must pass.
8. Create the first email-bound invite below. Production never includes seeded demo accounts.

A GitHub `production` environment with required reviewers will pause deployment if you have configured that rule. A Cloudflare API token stored only as a variable is deliberately not consumed.

## Local CLI production setup

Wrangler is already installed as a dev dependency; use Node 22.12+:

```bash
npm ci
npx wrangler login
npx wrangler whoami
npx wrangler d1 list
```

For a new manual deployment (when CI has not created the DB):

```bash
npx wrangler d1 create fittrio-db
```

Copy the returned `database_id` into the D1 binding in `wrangler.jsonc`. If CI already created it, use that existing ID, not a second database. Keep the account ID in local configuration or `CLOUDFLARE_ACCOUNT_ID` when needed.

```bash
npm run db:migrate:remote
npm run check
npm run deploy
npx wrangler secret put PASSWORD_PEPPER
```

For the last command, supply a random 32-byte hex value generated locally. **Only set it on the first deployment.** Never overwrite an existing pepper; all passwords depend on it. To use automated provisioning locally instead, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your terminal’s private environment and run `npm run build && node scripts/cloudflare.mjs`.

## Create invited accounts

With the correct production D1 ID in the local Wrangler configuration:

```bash
npm run invite -- your-email@example.com --remote
```

The administrator CLI prints a one-use code, valid for seven days. Send it privately to that email’s owner; do not post it in public Actions logs or GitHub issues. Open the production URL → Have an invitation? → enter name/email/code and choose a unique password of at least 12 characters.

Local invitations:

```bash
npm run invite -- friend@example.com --local
```

Invite-only registration has no public invitation-creation API. Invite recipients are separate users with separate private data, in one shared circle.

## Production migrations

Local: `npm run db:migrate`. For production, back up first, review the SQL, then run explicitly:

```bash
npx wrangler d1 export fittrio-db --remote --output=fittrio-before-migration.sql.backup
npx wrangler d1 migrations list fittrio-db --remote
npm run db:migrate:remote
```

CI applies initial migrations only when it has just created a new DB. It never automatically applies future migrations to an existing DB. Deploy additive/backward-compatible schema changes before code that requires them. Destructive SQL needs a deliberate maintenance plan. Worker rollback does not roll back D1.

## Backups and recovery

Run a weekly backup and one before migrations:

```bash
npx wrangler d1 export fittrio-db --remote --output=fittrio-history.sql.backup
```

Keep an encrypted copy outside the repository. Do not commit exports. Protect the Worker pepper separately in a password manager if you supplied it manually; if the generated pepper is lost, existing passwords cannot be verified and accounts need recovery.

D1 Time Travel is another recovery option, with retention varying by plan. Use `npx wrangler d1 time-travel info fittrio-db` and consult current Cloudflare documentation before a restore. Rehearse restoration into a separate database. Importing an export into a fresh database uses `npx wrangler d1 execute NEW_DATABASE --remote --file=backup.sql`, after checking the export and binding configuration.

Settings also offers a per-user JSON export; this supplements a database backup and does not currently support import.

## Forgotten password recovery

No public reset flow or email service is included. An administrator can use D1’s console or authenticated CLI to set that user’s `password_hash` to an invalid value (disables login) and delete their sessions before investigating. A complete reset requires calculating a new scrypt hash with the **original pepper**, then updating only that user’s row and invalidating sessions. Do not rotate the shared pepper as a reset procedure. Until an admin reset tool is added, retain access to your password manager and an existing session to change passwords in Settings.

## Troubleshooting

- GitHub writes return 403: install the ChatGPT GitHub connector for FitTrio; account OAuth alone is insufficient.
- Cloudflare 403: check account scope and Workers/D1 permissions; store the token as a GitHub secret.
- Database not found: use the existing database ID in Wrangler. CI’s discovered ID appears in its summary.
- Missing table after first failed provisioning: a DB may have been created before migration failed. Review and explicitly run remote migrations, then rerun the workflow.
- Resource error 1102 on auth: Workers Free’s 10ms CPU limit is insufficient for scrypt. Upgrade Workers yourself and rerun; never weaken hashing.
- Authentication 500: confirm a PASSWORD_PEPPER Worker secret of at least 32 characters exists.
- Local seeded login fails: the pepper changed. For disposable local data, reset the local DB and seed again; preserve production data and pepper.
- CSRF 403: use the same production origin and the React client. Writes require JSON, Origin, and `X-FitTrio-Request: 1`.
- Local server cannot enumerate network interfaces: this is an execution-environment restriction, not an app requirement; ordinary local machines are unaffected.

## Production checks

Confirm HTTPS, login/registration with a private invite, logout, logging/weight persistence after refresh, settings/theme, private group behavior, and calendar navigation. Try a second account to verify isolation. Test real iPhone Safari and Android Chrome. Health: `GET /api/health`; unauthenticated `GET /api/data` must return 401.

Direct image uploads can later add an R2 binding behind a feature flag. No R2 permission is needed now.
