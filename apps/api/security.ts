import { scryptSync, timingSafeEqual } from 'node:crypto';
export function randomToken(): string {
  return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}
export async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, '0')).join('');
}
export function hashPassword(password: string, pepper: string, salt = randomToken()): string {
  if (pepper.length < 32) throw new Error('PASSWORD_PEPPER must contain at least 32 characters');
  // OWASP scrypt configuration: N=2^14, r=8, p=5. Pepper is stored outside D1.
  const result = scryptSync(`${password}\0${pepper}`, salt, 32, {
    N: 16384,
    r: 8,
    p: 5,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt:16384:8:5:${salt}:${Array.from(result, (n) => n.toString(16).padStart(2, '0')).join('')}`;
}
export function verifyPassword(password: string, hash: string, pepper: string): boolean {
  const parts = hash.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const actual = hashPassword(password, pepper, parts[4]).split(':')[5];
  const a = Buffer.from(actual, 'hex'),
    b = Buffer.from(parts[5], 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
