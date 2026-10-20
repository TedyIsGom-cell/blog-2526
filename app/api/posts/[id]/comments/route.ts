import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashCommentPassword } from '@/lib/auth';
import { checkSameOrigin, getCurrentUser } from '@/lib/server-auth';
import { publicCommentSelect, serializeComment } from '@/lib/comments';
type Context = { params: Promise<{ id: string }> };
async function publishedPost(context: Context) {
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return prisma.post.findFirst({ where: { id, published: true }, select: { id: true } });
}
export async function GET(_req: Request, context: Context) {
  const post = await publishedPost(context);
  if (!post) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  const comments = await prisma.comment.findMany({ where: { postId: post.id }, orderBy: { createdAt: 'asc' }, select: publicCommentSelect });
  return NextResponse.json(comments.map(serializeComment));
}
export async function POST(req: Request, context: Context) {
  if (!checkSameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const post = await publishedPost(context);
  if (!post) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 });
  const { content, parentId } = body;
  const user = await getCurrentUser(req);
  const author = user ? user.name : body.author;
  const password = user ? '' : body.password;
  if (typeof content !== 'string' || !content.trim() || content.length > 10000 || (!user && (typeof author !== 'string' || !author.trim() || author.length > 80 || typeof password !== 'string' || !password.trim() || password.length > 256))) return NextResponse.json({ error: '이름, 비밀번호, 댓글 내용(1만 자 이하)을 확인해주세요.' }, { status: 400 });
  let parent: number | null = null;
  if (parentId !== undefined && parentId !== null) {
    parent = Number(parentId);
    if (!Number.isSafeInteger(parent) || !await prisma.comment.findFirst({ where: { id: parent, postId: post.id }, select: { id: true } })) return NextResponse.json({ error: '같은 글의 댓글에만 답글을 달 수 있습니다.' }, { status: 400 });
  }
  const comment = await prisma.comment.create({ data: { postId: post.id, parentId: parent, author: author.trim(), userId: user?.id || null, password: user ? '' : await hashCommentPassword(password), content: content.trim() }, select: publicCommentSelect });
  return NextResponse.json(serializeComment(comment), { status: 201 });
}
