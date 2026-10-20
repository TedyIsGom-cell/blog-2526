import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { daysOldAt } from '@/lib/format';
import { requireUser } from '@/lib/server-auth';

export async function GET(req: Request) {
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;

  const [comments, siteStat] = await Promise.all([
    prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { birthDate: true } }, post: { select: { id: true, title: true } } },
    }),
    prisma.siteStat.findUnique({ where: { id: 1 } }),
  ]);

  const lastSeen = siteStat?.lastSeenCommentAt || null;
  const unreadCount = lastSeen
    ? await prisma.comment.count({ where: { createdAt: { gt: lastSeen } } })
    : await prisma.comment.count();

  return NextResponse.json({
    unreadCount,
    comments: comments.map((c) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      createdAt: c.createdAt,
      ageDays: daysOldAt(c.user?.birthDate, c.createdAt),
      postId: c.postId,
      postTitle: c.post.title,
    })),
  });
}
