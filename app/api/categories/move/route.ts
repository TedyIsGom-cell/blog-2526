import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/server-auth';

export async function POST(req: Request) {
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;

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
