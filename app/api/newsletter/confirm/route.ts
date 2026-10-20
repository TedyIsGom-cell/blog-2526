import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  // This bearer token proves mailbox access and can be opened without a login.
  const body = await req.json().catch(() => null);
  if (typeof body?.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) {
    return NextResponse.json({ error: '유효하지 않은 확인 링크입니다.' }, { status: 400 });
  }
  const confirmationTokenHash = createHash('sha256').update(body.token).digest('hex');
  const changed = await prisma.newsletterSubscription.updateMany({
    where: { confirmationTokenHash, confirmationExpiresAt: { gt: new Date() } },
    data: { enabled: true, confirmedAt: new Date(), confirmationTokenHash: null, confirmationExpiresAt: null },
  });
  if (!changed.count) return NextResponse.json({ error: '이미 사용했거나 만료된 링크입니다. 내 계정에서 다시 신청해주세요.' }, { status: 400 });
  return NextResponse.json({ success: true });
}
