import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { daysOldAt } from '@/lib/format';
import { requireUser } from '@/lib/server-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;

  const category = await prisma.category.findUnique({ where: { id: Number(routeId) } });
  if (!category) {
    return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: { category: category.name },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, createdAt: true, author: { select: { name: true, birthDate: true } } },
  });

  return NextResponse.json({ category: category.name, posts: posts.map(({ author, ...post }) => ({ ...post, author: author?.name || '기존 글', ageDays: daysOldAt(author?.birthDate, post.createdAt) })) });
}
