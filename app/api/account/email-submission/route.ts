import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { canWrite, checkSameOrigin, getCurrentUser } from '@/lib/server-auth';
import { inboundIsConfigured, newSubmissionCredential, normalizeSubmissionDomain } from '@/lib/inbound-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!canWrite(user)) return NextResponse.json({ error: '집필자 권한이 필요합니다.' }, { status: 403 });
  const [credential, submissions] = await Promise.all([
    prisma.emailSubmissionCredential.findUnique({ where: { userId: user.id }, select: { tokenHint: true, updatedAt: true } }),
    prisma.emailSubmission.findMany({ where: { sender: user.email }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, status: true, error: true, postId: true, createdAt: true } }),
  ]);
  return NextResponse.json({ configured: inboundIsConfigured(), senderEmail: user.email, credential, submissions }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!canWrite(user)) return NextResponse.json({ error: '집필자 권한이 필요합니다.' }, { status: 403 });
  if (!inboundIsConfigured()) return NextResponse.json({ error: '운영자가 이메일 수신 도메인과 서비스를 먼저 설정해야 합니다.' }, { status: 503 });
  const credential = newSubmissionCredential(normalizeSubmissionDomain(process.env.INBOUND_EMAIL_DOMAIN)!);
  await prisma.emailSubmissionCredential.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash: credential.tokenHash, tokenHint: credential.tokenHint },
    update: { tokenHash: credential.tokenHash, tokenHint: credential.tokenHint },
  });
  return NextResponse.json({ address: credential.address }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  // Allow revocation even after a writer has been demoted to reader.
  await prisma.emailSubmissionCredential.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ revoked: true });
}
