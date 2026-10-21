import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/server-auth';
import { publicCommentSelect, serializeComment } from '@/lib/comments';
type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Context) {
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 10000) return NextResponse.json({ error: '댓글 내용(1만 자 이하)을 확인해주세요.' }, { status: 400 });
  const result = await prisma.comment.updateMany({ where: { id }, data: { content: body.content.trim() } });
  if (!result.count) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  const comment = await prisma.comment.findUnique({ where: { id }, select: publicCommentSelect });
  return comment ? NextResponse.json(serializeComment(comment)) : NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
}
export async function DELETE(req: Request, { params }: Context) {
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  const result = await prisma.comment.deleteMany({ where: { id } });
  if (!result.count) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
