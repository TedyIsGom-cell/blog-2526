import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { daysOldAt } from '@/lib/format';
import { requireUser } from '@/lib/server-auth';

export async function GET() {
  const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true, birthDate: true } } } });
  return NextResponse.json(posts.map(({ author, ...post }) => ({ ...post, author: author ? { name: author.name } : null, ageDays: daysOldAt(author?.birthDate, post.createdAt) })));
}
export async function POST(req: Request) {
  const user = await requireUser(req, ['ADMIN', 'WRITER']);
  if (user instanceof Response) return user;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 });
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  const category = typeof body.category === 'string' ? body.category.trim() || '일반' : '일반';
  if (!title || title.length > 300 || !content.trim() || content.length > 200000 || category.length > 100 || (body.published !== undefined && typeof body.published !== 'boolean')) return NextResponse.json({ error: '제목(300자), 본문(20만 자), 카테고리(100자) 입력을 확인해주세요.' }, { status: 400 });
  const post = await prisma.$transaction(async tx => {
    await tx.category.upsert({ where: { name: category }, update: {}, create: { name: category } });
    return tx.post.create({ data: { title, content, category, published: body.published ?? true, authorId: user.id, slug: `post-${randomUUID()}` } });
  });
  return NextResponse.json(post, { status: 201 });
}
