import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { postIds, targetCategoryName } = await req.json();

  if (!Array.isArray(postIds) || postIds.length === 0 || !targetCategoryName?.trim()) {
    return NextResponse.json({ error: '옮길 글과 대상 카테고리를 선택해주세요.' }, { status: 400 });
  }

  const target = targetCategoryName.trim();

  await prisma.category.upsert({
    where: { name: target },
    update: {},
    create: { name: target },
  });

  await prisma.post.updateMany({
    where: { id: { in: postIds.map(Number) } },
    data: { category: target },
  });

  return NextResponse.json({ success: true, movedCount: postIds.length });
}
