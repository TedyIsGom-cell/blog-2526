import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { formatDateWithAge } from '@/lib/format';
import { getCurrentUser, checkSameOrigin } from '@/lib/server-auth';
import { emailConfiguration } from '@/lib/email';
import { dispatchNewsletter, excerpt, getDigestCandidates, weeklyIssueKey } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: user ? 403 : 401 });
  const [posts, subscribers, issues, currentIssue] = await Promise.all([
    getDigestCandidates(),
    prisma.newsletterSubscription.count({ where: { enabled: true, confirmedAt: { not: null } } }),
    prisma.newsletterIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { deliveries: { select: { status: true, error: true } } } }),
    prisma.newsletterIssue.findUnique({ where: { key: weeklyIssueKey() }, select: { id: true } }),
  ]);
  return NextResponse.json({
    configuration: emailConfiguration(), subscribers, weeklyKey: weeklyIssueKey(), currentIssueId: currentIssue?.id || null,
    posts: posts.map((post) => ({ id: post.id, title: post.title, author: post.author?.name || '기존 글', excerpt: excerpt(post.content), dateLabel: formatDateWithAge(post.createdAt, post.author?.birthDate) })),
    issues: issues.map(({ deliveries, ...issue }) => ({
      id: issue.id, title: issue.title, key: issue.key, createdAt: issue.createdAt,
      total: deliveries.length,
      sent: deliveries.filter((delivery) => delivery.status === 'SENT').length,
      pending: deliveries.filter((delivery) => ['PENDING', 'SENDING', 'FAILED', 'UNKNOWN'].includes(delivery.status)).length,
      skipped: deliveries.filter((delivery) => delivery.status === 'SKIPPED').length,
      errors: Array.from(new Set(deliveries.map((delivery) => delivery.error).filter(Boolean))),
    })),
  });
}

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const user = await getCurrentUser(req);
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: user ? 403 : 401 });
  const body = await req.json().catch(() => null);
  if (body?.confirm !== true || (body.issueId !== undefined && typeof body.issueId !== 'string')) {
    return NextResponse.json({ error: '발송 확인이 필요합니다.' }, { status: 400 });
  }
  if (body.issueId && !await prisma.newsletterIssue.findUnique({ where: { id: body.issueId }, select: { id: true } })) {
    return NextResponse.json({ error: '뉴스레터를 찾을 수 없습니다.' }, { status: 404 });
  }
  const result = await dispatchNewsletter({ issueId: body.issueId });
  return NextResponse.json(result, { status: result.configured ? 200 : 503 });
}
