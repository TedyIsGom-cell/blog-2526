import { NextResponse } from 'next/server';
import {
  inboundIsConfigured, InvalidSubmissionError, MAX_WEBHOOK_BYTES, normalizeSubmissionDomain,
  parseMailbox, publishReceivedEmail, readLimitedText, retrieveReceivedEmail, verifyInboundWebhook,
} from '@/lib/inbound-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!inboundIsConfigured()) return NextResponse.json({ error: '이메일 투고가 설정되지 않았습니다.' }, { status: 503 });
  let event: unknown;
  try {
    const payload = await readLimitedText(req, MAX_WEBHOOK_BYTES);
    event = verifyInboundWebhook(payload, req.headers, process.env.RESEND_WEBHOOK_SECRET!);
  } catch (error) {
    return NextResponse.json({ error: '유효한 웹훅 서명이 필요합니다.' }, { status: error instanceof InvalidSubmissionError ? 413 : 400 });
  }
  if (!event || typeof event !== 'object' || !('type' in event)) return NextResponse.json({ error: '잘못된 이벤트입니다.' }, { status: 400 });
  if (event.type !== 'email.received') return NextResponse.json({ received: true });
  const data = 'data' in event ? event.data : null;
  const emailId = data && typeof data === 'object' && 'email_id' in data ? data.email_id : null;
  if (typeof emailId !== 'string' || !/^[a-z0-9-]{10,80}$/i.test(emailId)) return NextResponse.json({ error: '메일 ID가 필요합니다.' }, { status: 400 });
  try {
    const email = await retrieveReceivedEmail(emailId, process.env.RESEND_API_KEY!);
    await publishReceivedEmail(email, normalizeSubmissionDomain(process.env.INBOUND_EMAIL_DOMAIN)!);
    // Never disclose credential validity or sender membership in the webhook response.
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof InvalidSubmissionError) {
      // Oversized messages cannot succeed on retry. Keep a visible rejection in the writer's history.
      try {
        const { prisma } = await import('@/lib/db');
        const sender = data && typeof data === 'object' && 'from' in data ? parseMailbox(data.from) : null;
        await prisma.emailSubmission.upsert({
          where: { providerMessageId: emailId },
          update: {},
          create: { providerMessageId: emailId, sender: sender || '(invalid)', status: 'REJECTED', error: '메일 크기 제한(2 MiB)을 초과했습니다. 본문을 줄여 다시 보내주세요.' },
        });
        return NextResponse.json({ received: true, ignored: true });
      } catch {
        return NextResponse.json({ error: '처리 결과를 저장하지 못했습니다.' }, { status: 503 });
      }
    }
    // A temporary provider/database failure must remain retryable. Do not log bodies or tokens.
    console.error('Inbound email processing failed', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: '일시적인 처리 오류입니다. 다시 시도해주세요.' }, { status: 503 });
  }
}
