import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, safeEqual } from '@/lib/auth';
import { validateBirthDate } from '@/lib/birthdays';
import { authThrottleKey, checkSameOrigin, consumeAuthAttempt, createUserSession, userSelect } from '@/lib/server-auth';

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 });
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 80 || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) return NextResponse.json({ error: '이름(1~80자), 이메일, 12~256자 비밀번호를 입력해주세요.' }, { status: 400 });
  const { date: birthDate, error: birthDateError } = validateBirthDate(body.birthDate);
  if (birthDateError) return NextResponse.json({ error: birthDateError }, { status: 400 });
  if (!await consumeAuthAttempt(authThrottleKey(req, 'register'), 8)) return NextResponse.json({ error: '가입 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' }, { status: 429, headers: { 'Retry-After': '900' } });
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const wantsAdmin = !!adminEmail && email === adminEmail;
  const validSetup = !!process.env.ADMIN_SETUP_TOKEN && typeof body.setupToken === 'string' && safeEqual(body.setupToken, process.env.ADMIN_SETUP_TOKEN);
  if (wantsAdmin && !validSetup) return NextResponse.json({ error: '이 이메일로 가입하려면 관리자 초기 설정 코드가 필요합니다.' }, { status: 403 });
  const passwordHash = await hashPassword(body.password);
  try {
    const user = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(842107)::text AS locked`;      const noAdmin = await tx.user.count({ where: { role: 'ADMIN' } }) === 0;
      const noAdmin = await tx.user.count({ where: { role: 'ADMIN' } }) === 0;
      return tx.user.create({ data: { name, email, passwordHash, birthDate, role: wantsAdmin && validSetup && noAdmin ? 'ADMIN' : 'READER' }, select: userSelect });
    });
    const res = NextResponse.json({ user }, { status: 201 });
    await createUserSession(user.id, res);
    return res;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
    throw error;
  }
}
