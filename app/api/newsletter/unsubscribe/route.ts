import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Mail scanners often follow links; only a POST changes the subscription.
  const target = new URL('/newsletter/unsubscribe', req.url);
  const token = new URL(req.url).searchParams.get('token');
  if (token) target.searchParams.set('token', token);
  return NextResponse.redirect(target);
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token || token.length > 200) return NextResponse.json({ error: '유효하지 않은 수신 거부 링크입니다.' }, { status: 400 });
  const changed = await prisma.newsletterSubscription.updateMany({ where: { unsubscribeToken: token }, data: { enabled: false, confirmedAt: null, confirmationTokenHash: null, confirmationExpiresAt: null } });
  if (!changed.count) return NextResponse.json({ error: '유효하지 않은 수신 거부 링크입니다.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
