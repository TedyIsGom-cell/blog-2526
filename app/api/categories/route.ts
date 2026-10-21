import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const counts = await prisma.post.groupBy({
    by: ['category'],
    _count: { category: true },
  });
  const countMap = new Map(counts.map((c) => [c.category, c._count.category]));

  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    postCount: countMap.get(c.name) || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { name, parentId } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: '카테고리 이름을 입력해주세요.' }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        parentId: parentId ? Number(parentId) : null,
      },
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: '이미 존재하는 카테고리입니다.' }, { status: 400 });
  }
}
