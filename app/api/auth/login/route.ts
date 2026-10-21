import { authApiError } from '@/lib/auth-api-error';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { authThrottleKey, checkSameOrigin, consumeAuthAttempt, createUserSession, revokeUserSession, userSelect } from '@/lib/server-auth';

// Same work factor is used for nonexistent accounts to reduce timing disclosure.
const dummyHash = hashPassword('this-is-not-an-account-password');
async function login(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 });
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || typeof body.password !== 'string' || body.password.length > 256) return NextResponse.json({ error: '이메일과 비밀번호를 확인해주세요.' }, { status: 400 });
  if (!await consumeAuthAttempt(authThrottleKey(req, 'login-email', email)) || !await consumeAuthAttempt(authThrottleKey(req, 'login-ip'), 50)) return NextResponse.json({ error: '시도가 너무 많습니다. 15분 후 다시 시도해주세요.' }, { status: 429, headers: { 'Retry-After': '900' } });
  const user = await prisma.user.findUnique({ where: { email }, select: { ...userSelect, passwordHash: true } });
  const passwordAccount = !!user && user.passwordHash.startsWith('scrypt$');
  const passwordMatches = await verifyPassword(body.password, passwordAccount ? user!.passwordHash : await dummyHash);
  if (!passwordAccount || !passwordMatches || !user) return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  const { passwordHash: _, ...safeUser } = user;
  const res = NextResponse.json({ user: safeUser });
  await createUserSession(user.id, res);
  return res;
}
export async function DELETE(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const res = NextResponse.json({ success: true });
  await revokeUserSession(req, res);
  return res;
}

export async function POST(req: Request) {
  try { return await login(req); }
  catch (error) { return authApiError(error, 'login'); }
}
