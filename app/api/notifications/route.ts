import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function GET(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const [comments, siteStat] = await Promise.all([
    prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { post: { select: { id: true, title: true } } },
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
      postId: c.postId,
      postTitle: c.post.title,
    })),
  });
}
