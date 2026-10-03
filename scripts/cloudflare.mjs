import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const account = process.env.CLOUDFLARE_ACCOUNT_ID,
  token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token)
  throw new Error(
    'Configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in GitHub Actions secrets (account ID may be a variable).',
  );
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;
async function api(path, method = 'GET', body) {
  const r = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok || !data.success)
    throw new Error(
      `Cloudflare ${method} ${path} failed (${r.status}). Check token permissions. ${data.errors?.map((e) => `${e.code}: ${e.message}`).join('; ') ?? ''}`,
    );
  return data.result;
}
const run = (...args) => execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit' });
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
const databases = await api('/d1/database?per_page=100');
let database = databases.find((d) => d.name === 'fittrio-db');
const created = !database;
if (created) {
  database = await api('/d1/database', 'POST', { name: 'fittrio-db' });
  console.log('Created the FitTrio D1 database.');
}
config.d1_databases[0].database_id = database.uuid;
config.account_id = account;
writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2) + '\n');
if (created) {
  run('d1', 'migrations', 'apply', 'fittrio-db', '--remote');
} else {
  console.log(
    'Reusing existing D1 database. Future migrations require an explicit administrator command; see docs/deployment.md.',
  );
}
run('deploy');
const secrets = await api('/workers/scripts/fittrio/secrets');
if (!secrets.some((s) => s.name === 'PASSWORD_PEPPER')) {
  await api('/workers/scripts/fittrio/secrets', 'PUT', {
    name: 'PASSWORD_PEPPER',
    text: randomBytes(32).toString('hex'),
    type: 'secret_text',
  });
  console.log('Created PASSWORD_PEPPER as a Worker secret; its value is never printed.');
}
const subdomain = await api('/workers/subdomain');
const url = `https://fittrio.${subdomain.subdomain}.workers.dev`;
// A failed production authentication probe fails deployment validation.
const health = await fetch(url + '/api/health');
if (!health.ok) throw new Error('Production health check failed.');
const login = await fetch(url + '/api/auth/login', {
  method: 'POST',
  headers: { Origin: url, 'Content-Type': 'application/json', 'X-FitTrio-Request': '1' },
  body: JSON.stringify({
    email: 'deployment-check@fittrio.invalid',
    password: 'not-a-real-password-123',
  }),
});
if (login.status !== 401)
  throw new Error(
    `Production password-hashing probe failed (${login.status}). If Cloudflare reports resource limits, Workers Paid is required; never weaken hashing to fit the free plan.`,
  );
console.log(`Production: ${url}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `FitTrio deployed: ${url}\n\nD1: fittrio-db (${database.uuid})\n\nHealth and authentication rejection checks passed. Production has no demo accounts. Create your first invite using docs/deployment.md.\n`,
    { flag: 'a' },
  );
}
