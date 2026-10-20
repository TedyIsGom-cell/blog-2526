import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkSameOrigin } from '@/lib/server-auth';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  const result = await prisma.comment.updateMany({ where: { id, post: { published: true } }, data: { likeCount: { increment: 1 } } });
  if (!result.count) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  const comment = await prisma.comment.findUnique({ where: { id }, select: { likeCount: true } });
  return NextResponse.json({ likeCount: comment?.likeCount ?? 0 });
}
