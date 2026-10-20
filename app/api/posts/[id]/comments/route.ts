import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashCommentPassword } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { postId: Number(params.id) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      author: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      likeCount: true,
      parentId: true,
      // password는 절대 클라이언트로 내려주지 않습니다.
    },
  });
  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { author, password, content, parentId } = await req.json();

  if (!author?.trim() || !password?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: '이름, 비밀번호, 내용을 모두 입력해주세요.' },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      postId: Number(params.id),
      parentId: parentId ? Number(parentId) : null,
      author: author.trim(),
      password: await hashCommentPassword(password),
      content: content.trim(),
    },
    select: {
      id: true,
      author: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      likeCount: true,
      parentId: true,
    },
  });

  return NextResponse.json(comment);
}
