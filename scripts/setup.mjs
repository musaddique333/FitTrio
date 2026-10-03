import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
if (!existsSync('.dev.vars')) {
  writeFileSync(
    '.dev.vars',
    `ENVIRONMENT=development\nPASSWORD_PEPPER=${randomBytes(32).toString('hex')}\n`,
    { mode: 0o600 },
  );
  console.log('Created development secrets. Keep .dev.vars private and retain it between runs.');
}
mkdirSync('dist', { recursive: true });
if (!existsSync('dist/index.html'))
  writeFileSync('dist/index.html', '<p>Start Vite on port 5173.</p>');
