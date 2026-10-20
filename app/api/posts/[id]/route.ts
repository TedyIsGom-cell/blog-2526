import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { canEditPost, requireUser } from '@/lib/server-auth';

type Context = { params: Promise<{ id: string }> };
async function postId(context: Context): Promise<number | null> {
  const value = Number((await context.params).id);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
export async function GET(req: Request, context: Context) {
  const user = await requireUser(req, ['ADMIN', 'WRITER']);
  if (user instanceof Response) return user;
  const id = await postId(context);
  if (!id) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  if (!canEditPost(user, post.authorId)) return NextResponse.json({ error: '본인이 작성한 글만 편집할 수 있습니다.' }, { status: 403 });
  return NextResponse.json(post, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(req: Request, context: Context) {
  const user = await requireUser(req, ['ADMIN', 'WRITER']);
  if (user instanceof Response) return user;
  const id = await postId(context);
  if (!id) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 });
  const { title, content, category, published } = body;
  if ((title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 300)) || (content !== undefined && (typeof content !== 'string' || !content.trim() || content.length > 200000)) || (category !== undefined && (typeof category !== 'string' || category.length > 100)) || (published !== undefined && typeof published !== 'boolean')) return NextResponse.json({ error: '글 입력 형식을 확인해주세요.' }, { status: 400 });
  const current = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!current) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  if (!canEditPost(user, current.authorId)) return NextResponse.json({ error: '본인이 작성한 글만 수정할 수 있습니다.' }, { status: 403 });
  // Keep ownership in the write predicate so it cannot change between check and update.
  const result = await prisma.$transaction(async tx => {
    if (category !== undefined) await tx.category.upsert({ where: { name: category.trim() || '일반' }, update: {}, create: { name: category.trim() || '일반' } });
    return tx.post.updateMany({ where: { id, ...(user.role !== 'ADMIN' && { authorId: user.id }) }, data: {
      ...(title !== undefined && { title: title.trim() }), ...(content !== undefined && { content }), ...(category !== undefined && { category: category.trim() || '일반' }), ...(published !== undefined && { published }),
    } });
  });
  if (!result.count) return NextResponse.json({ error: '글을 수정할 수 없습니다.' }, { status: 403 });
  return NextResponse.json(await prisma.post.findUnique({ where: { id } }));
}
export async function DELETE(req: Request, context: Context) {
  const user = await requireUser(req, ['ADMIN']);
  if (user instanceof Response) return user;
  const id = await postId(context);
  if (!id) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  const result = await prisma.post.deleteMany({ where: { id } });
  if (!result.count) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
