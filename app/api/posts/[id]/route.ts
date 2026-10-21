import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { id: Number(params.id) } });
  if (!post) {
    return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 });
  }
  return NextResponse.json(post);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { title, content, category, published } = await req.json();

  if (category !== undefined && category.trim()) {
    await prisma.category.upsert({
      where: { name: category.trim() },
      update: {},
      create: { name: category.trim() },
    });
  }

  const post = await prisma.post.update({
    where: { id: Number(params.id) },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category: category.trim() }),
      ...(published !== undefined && { published }),
    },
  });

  return NextResponse.json(post);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  await prisma.post.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
