import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import { digest, randomToken } from '../apps/api/security';
const email = z.string().email().parse(process.argv[2]).toLowerCase();
const mode = process.argv[3];
if (!['--local', '--remote'].includes(mode))
  throw new Error('Usage: npm run invite -- friend@example.com --local|--remote');
if (process.argv.length !== 4) throw new Error('Unexpected argument.');
const token = randomToken();
const hash = await digest(token);
const timestamp = Date.now();
mkdirSync('.wrangler', { recursive: true });
const path = '.wrangler/invite.sql';
writeFileSync(
  path,
  `INSERT INTO invitations(token_hash,email,expires_at,created_at) VALUES ('${hash}','${email.replaceAll("'", "''")}',${timestamp + 7 * 86400000},${timestamp});`,
  { mode: 0o600 },
);
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'fittrio-db', mode, '--file', path], {
    stdio: 'inherit',
  });
} finally {
  unlinkSync(path);
}
console.log(`One-use invite for ${email}, expires in 7 days. Send privately: ${token}`);
