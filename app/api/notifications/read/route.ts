import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  await prisma.siteStat.upsert({
    where: { id: 1 },
    update: { lastSeenCommentAt: new Date() },
    create: { id: 1, lastSeenCommentAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
