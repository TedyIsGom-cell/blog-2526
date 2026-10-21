import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'blog_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export function randomToken(): string { return randomBytes(32).toString('hex'); }
export function sessionTokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => err ? reject(err) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encoded] = stored.split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(encoded, 'hex'));
}
export function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}
// Existing guest comments retain their current hash format.
export async function hashCommentPassword(password: string): Promise<string> { return sessionTokenHash(password); }
export function getSessionTokenFromRequest(req: Request): string | undefined {
  return req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}
