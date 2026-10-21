import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { googleConfig } from '@/lib/google-oidc';
import { beginGoogleFlow } from '@/lib/google-flow';
import { requireUser, authThrottleKey, consumeAuthAttempt } from '@/lib/server-auth';
import { authApiError } from '@/lib/auth-api-error';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user instanceof Response) return user;
    const config = googleConfig();
    if (!config) return NextResponse.json({ error: 'Google 로그인을 아직 준비 중입니다.' }, { status: 503 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body.password !== 'string' || !body.password || body.password.length > 256) {
      return NextResponse.json({ error: '기존 계정의 비밀번호를 입력해주세요.' }, { status: 400 });
    }
    if (!await consumeAuthAttempt(authThrottleKey(req, 'google-link', user.id), 8)) {
      return NextResponse.json({ error: '시도가 너무 많습니다. 15분 후 다시 시도해주세요.' }, { status: 429 });
    }
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, googleSubject: true } });
    if (!account || !await verifyPassword(body.password, account.passwordHash)) {
      return NextResponse.json({ error: '기존 계정의 비밀번호를 확인해주세요.' }, { status: 401 });
    }
    if (account.googleSubject) return NextResponse.json({ error: '이미 Google 계정이 연결되어 있습니다.' }, { status: 409 });
    const flow = await beginGoogleFlow(req, config, 'link', user.id);
    return flow.attachCookie(NextResponse.json({ url: flow.url }));
  } catch (error) {
    return authApiError(error, 'google-link');
  }
}
