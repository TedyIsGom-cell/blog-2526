import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkSameOrigin } from '@/lib/server-auth';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  const result = await prisma.post.updateMany({ where: { id, published: true }, data: { likeCount: { increment: 1 } } });
  if (!result.count) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  const post = await prisma.post.findUnique({ where: { id }, select: { likeCount: true } });
  return NextResponse.json({ likeCount: post?.likeCount ?? 0 });
}
