import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionTokenFromRequest, randomToken, SESSION_COOKIE, SESSION_SECONDS, sessionTokenHash } from '@/lib/auth';

export type SafeUser = { id: string; name: string; email: string; role: UserRole; birthDate: Date | null; createdAt: Date };
export const memberSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const;
export const userSelect = { ...memberSelect, birthDate: true } as const;
export async function getCurrentUser(req?: Request): Promise<SafeUser | null> {
  const token = req ? getSessionTokenFromRequest(req) : (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sessionTokenHash(token) }, select: { expiresAt: true, user: { select: userSelect } } });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export { isAdmin, canWrite, canEditPost } from '@/lib/permissions';
export function checkSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return origin ? origin === new URL(req.url).origin : req.headers.get('sec-fetch-site') !== 'cross-site';
}
export async function requireUser(req: Request, roles?: UserRole[]): Promise<SafeUser | NextResponse> {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !checkSameOrigin(req)) return NextResponse.json({ error: '다른 사이트에서 보낸 요청은 허용되지 않습니다.' }, { status: 403 });
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (roles && !roles.includes(user.role)) return NextResponse.json({ error: '이 작업을 할 권한이 없습니다.' }, { status: 403 });
  return user;
}
export async function createUserSession(userId: string, res: NextResponse): Promise<void> {
  const token = randomToken();
  await prisma.session.create({ data: { userId, tokenHash: sessionTokenHash(token), expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS });
  res.cookies.delete('admin_session');
  res.headers.set('Cache-Control', 'no-store');
}
export async function revokeUserSession(req: Request, res: NextResponse): Promise<void> {
  const token = getSessionTokenFromRequest(req);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sessionTokenHash(token) } });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete('admin_session');
}
// Database-backed throttling also works across serverless instances.
export async function consumeAuthAttempt(key: string, limit = 12): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + 15 * 60 * 1000);
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "resetAt") VALUES (${key}, 1, ${until})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."resetAt" < ${now} THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" < ${now} THEN ${until} ELSE "AuthRateLimit"."resetAt" END
    RETURNING "attempts"`;
  return rows[0].attempts <= limit;
}
export function authThrottleKey(req: Request, operation: string, email = ''): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  return `${operation}:${sessionTokenHash(email || ip)}`;
}
