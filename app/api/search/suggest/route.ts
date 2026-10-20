import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q) {
    return NextResponse.json({ posts: [], categories: [] });
  }

  const [posts, categories] = await Promise.all([
    prisma.post.findMany({
      where: {
        published: true,
        title: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, title: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { name: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ posts, categories });
}
