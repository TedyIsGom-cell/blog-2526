import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const category = await prisma.category.findUnique({ where: { id: Number(params.id) } });
  if (!category) {
    return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: { category: category.name },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, createdAt: true },
  });

  return NextResponse.json({ category: category.name, posts });
}
