import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { emailConfiguration, sendEmail, type EmailPayload } from '@/lib/email';

import { buildDigest, canRetry, escapeHtml } from '@/lib/newsletter-utils';
export { buildDigest, canRetry, escapeHtml, excerpt, weeklyIssueKey } from '@/lib/newsletter-utils';
import { weeklyIssueKey } from '@/lib/newsletter-utils';

export async function getDigestCandidates() {
  const issues = await prisma.newsletterIssue.findMany({ select: { postIds: true } });
  const included = new Set<number>();
  for (const issue of issues) {
    if (Array.isArray(issue.postIds)) {
      for (const id of issue.postIds) if (typeof id === 'number') included.add(id);
    }
  }
  return prisma.post.findMany({
    where: { published: true, ...(included.size ? { id: { notIn: Array.from(included) } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: 30,
    select: { id: true, title: true, content: true, createdAt: true, author: { select: { name: true, birthDate: true } } },
  });
}

async function acquireLock() {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  const changed = await prisma.$executeRaw`
    INSERT INTO "NewsletterJobLock" ("id", "token", "expiresAt")
    VALUES ('dispatch', ${token}, ${expiresAt})
    ON CONFLICT ("id") DO UPDATE SET "token" = EXCLUDED."token", "expiresAt" = EXCLUDED."expiresAt"
    WHERE "NewsletterJobLock"."expiresAt" < NOW()
  `;
  return changed === 1 ? token : null;
}

function makePayload(issue: { title: string; html: string; text: string }, email: string, token: string): EmailPayload {
  const { siteUrl } = emailConfiguration();
  const unsubscribe = `${siteUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  const confirmation = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    from: process.env.EMAIL_FROM!,
    to: [email],
    subject: issue.title,
    html: `${issue.html}<footer style="max-width:640px;margin:24px auto;color:#64748b;padding:24px">수신에 동의한 회원에게 발송되었습니다. <a href="${escapeHtml(confirmation)}">수신 거부</a></footer>`,
    text: `${issue.text}\n\n수신 거부: ${confirmation}`,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

export async function dispatchNewsletter(options: { issueId?: string } = {}) {
  const config = emailConfiguration();
  if (!config.configured) return { configured: false, missing: config.missing, sent: 0 };
  const lockToken = await acquireLock();
  if (!lockToken) return { configured: true, busy: true, sent: 0 };
  const deadline = Date.now() + 42_000;
  let sent = 0;
  let failed = 0;
  let review = 0;
  try {
    if (!options.issueId) {
      const key = weeklyIssueKey();
      const already = await prisma.newsletterIssue.findUnique({ where: { key } });
      if (!already) {
        const [posts, subscriptions] = await Promise.all([
          getDigestCandidates(),
          prisma.newsletterSubscription.findMany({ where: { enabled: true, confirmedAt: { not: null } }, include: { user: { select: { email: true } } } }),
        ]);
        if (posts.length && subscriptions.length) {
          const digest = buildDigest(posts, config.siteUrl);
          await prisma.newsletterIssue.create({
            data: {
              key, ...digest, postIds: posts.map((post) => post.id),
              deliveries: { create: subscriptions.map((sub) => ({
                subscriptionId: sub.id,
                payload: makePayload(digest, sub.user.email, sub.unsubscribeToken) as unknown as Prisma.InputJsonValue,
              })) },
            },
          });
        }
      }
    }

    // Pending recipients are drained on later invocations. Never resend SENT records.
    const deliveries = await prisma.newsletterDelivery.findMany({
      where: {
        ...(options.issueId ? { issueId: options.issueId } : {}),
        OR: [
          { status: 'PENDING' },
          { status: { in: ['FAILED', 'UNKNOWN'] }, firstAttemptAt: { gt: new Date(Date.now() - 23 * 60 * 60_000) } },
          { status: 'SENDING', lastAttemptAt: { lt: new Date(Date.now() - 5 * 60_000) }, firstAttemptAt: { gt: new Date(Date.now() - 23 * 60 * 60_000) } },
        ],
      },
      include: { subscription: true, issue: { select: { postIds: true } } },
      orderBy: { id: 'asc' },
      take: 40,
    });
    for (const delivery of deliveries) {
      if (Date.now() >= deadline) break;
      if (!delivery.subscription.enabled || !delivery.subscription.confirmedAt) {
        await prisma.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED', error: null } });
        continue;
      }
      const snapshotIds = Array.isArray(delivery.issue.postIds)
        ? delivery.issue.postIds.filter((id): id is number => typeof id === 'number') : [];
      const publishedCount = snapshotIds.length ? await prisma.post.count({ where: { id: { in: snapshotIds }, published: true } }) : 0;
      if (!snapshotIds.length || publishedCount !== snapshotIds.length) {
        await prisma.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED', error: '묶음에 포함된 글이 삭제되거나 비공개되어 발송을 취소했습니다.' } });
        continue;
      }
      if (!canRetry(delivery.firstAttemptAt)) {
        await prisma.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: 'UNKNOWN', error: '중복 발송 방지를 위해 자동 재시도를 중단했습니다. Resend 기록을 확인해주세요.' } });
        review++;
        continue;
      }
      await prisma.newsletterDelivery.update({
        where: { id: delivery.id },
        data: { status: 'SENDING', attempts: { increment: 1 }, firstAttemptAt: delivery.firstAttemptAt || new Date(), lastAttemptAt: new Date() },
      });
      try {
        const providerId = await sendEmail(delivery.payload as unknown as EmailPayload, `newsletter/${delivery.id}`);
        await prisma.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', providerId, sentAt: new Date(), error: null } });
        sent++;
      } catch (error) {
        await prisma.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: 'UNKNOWN', error: error instanceof Error ? error.message : '발송 결과를 확인할 수 없습니다.' } });
        failed++;
        // Rate limits and network outages should not cascade across the full list.
        break;
      }
      // Respect the provider's default low request-rate limit.
      await new Promise((resolve) => setTimeout(resolve, 550));
    }
    // Expired uncertain attempts stay visible for review, but never block untouched recipients.
    await prisma.newsletterDelivery.updateMany({
      where: { status: { in: ['SENDING', 'FAILED', 'UNKNOWN'] }, firstAttemptAt: { lte: new Date(Date.now() - 23 * 60 * 60_000) } },
      data: { status: 'UNKNOWN', error: '중복 발송 방지를 위해 자동 재시도를 중단했습니다. Resend 기록을 확인해주세요.' },
    });
    const pending = await prisma.newsletterDelivery.count({ where: { status: { in: ['PENDING', 'SENDING', 'FAILED', 'UNKNOWN'] } } });
    return { configured: true, sent, failed, review, pending };
  } finally {
    await prisma.newsletterJobLock.deleteMany({ where: { id: 'dispatch', token: lockToken } });
  }
}
