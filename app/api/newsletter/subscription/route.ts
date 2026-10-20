import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, checkSameOrigin } from '@/lib/server-auth';
import { emailConfiguration, sendEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/newsletter-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const subscription = await prisma.newsletterSubscription.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    enabled: Boolean(subscription?.enabled && subscription.confirmedAt), email: user.email,
    pending: Boolean(subscription?.confirmationTokenHash && subscription.confirmationExpiresAt && subscription.confirmationExpiresAt > new Date()),
    configured: emailConfiguration().configured,
  });
}

export async function PUT(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== 'boolean') return NextResponse.json({ error: '수신 동의 여부를 선택해주세요.' }, { status: 400 });
  if (!body.enabled) {
    await prisma.newsletterSubscription.updateMany({
      where: { userId: user.id },
      data: { enabled: false, confirmedAt: null, confirmationTokenHash: null, confirmationExpiresAt: null },
    });
    return NextResponse.json({ enabled: false, pending: false });
  }
  const config = emailConfiguration();
  if (!config.configured) return NextResponse.json({ error: '관리자가 메일 서비스를 연결한 뒤 신청할 수 있습니다.' }, { status: 503 });
  const subscription = await prisma.newsletterSubscription.upsert({
    where: { userId: user.id }, create: { userId: user.id, enabled: false }, update: {},
  });
  if (subscription.enabled && subscription.confirmedAt) return NextResponse.json({ enabled: true, pending: false });
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  const now = new Date();
  const claim = await prisma.newsletterSubscription.updateMany({
    where: {
      id: subscription.id,
      OR: [{ confirmationSentAt: null }, { confirmationSentAt: { lt: new Date(now.getTime() - 60_000) } }],
    },
    data: { enabled: false, confirmedAt: null, confirmationTokenHash: hash, confirmationExpiresAt: new Date(now.getTime() + 24 * 60 * 60_000), confirmationSentAt: now },
  });
  if (!claim.count) return NextResponse.json({ error: '확인 메일을 방금 요청했습니다. 1분 후 다시 시도해주세요.' }, { status: 429, headers: { 'Retry-After': '60' } });
  const url = `${config.siteUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  try {
    await sendEmail({
      from: process.env.EMAIL_FROM!, to: [user.email], subject: '블로그 뉴스레터 수신 확인',
      html: `<p>블로그 주간 뉴스레터를 신청하셨습니다.</p><p><a href="${escapeHtml(url)}">이메일 주소 확인 및 수신 동의</a></p><p>링크는 24시간 동안 유효합니다. 신청한 적이 없다면 이 메일을 무시해주세요. 확인 전에는 뉴스레터를 보내지 않습니다.</p>`,
      text: `블로그 주간 뉴스레터 수신 확인: ${url}\n링크는 24시간 동안 유효합니다. 신청한 적이 없다면 이 메일을 무시해주세요.`,
      headers: {},
    }, `newsletter-confirm/${subscription.id}/${hash}`);
    return NextResponse.json({ enabled: false, pending: true });
  } catch {
    // A late provider response may still have delivered the link. Keep its token valid,
    // but do not claim that the confirmation message was successfully sent.
    return NextResponse.json({ error: '확인 메일의 발송 결과를 확인할 수 없습니다. 받은편지함을 확인하거나 1분 후 다시 요청해주세요.' }, { status: 502 });
  }
}
