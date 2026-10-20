import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession } from '@/lib/auth';

function getTokenFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/admin_session=([^;]+)/);
  return match ? match[1] : undefined;
}

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-');
  return `${base || 'post'}-${Date.now()}`;
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const token = getTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { title, content, category } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });
  }

  const finalCategory = category?.trim() || '일반';

  await prisma.category.upsert({
    where: { name: finalCategory },
    update: {},
    create: { name: finalCategory },
  });

  const post = await prisma.post.create({
    data: {
      title,
      content,
      category: finalCategory,
      slug: makeSlug(title),
    },
  });

  return NextResponse.json(post);
}
