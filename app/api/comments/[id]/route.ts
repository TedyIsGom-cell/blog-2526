import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '관리자만 수정할 수 있습니다.' }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }

  const comment = await prisma.comment.update({
    where: { id: Number(params.id) },
    data: { content: content.trim() },
    select: { id: true, author: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(comment);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '관리자만 삭제할 수 있습니다.' }, { status: 401 });
  }

  await prisma.comment.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
