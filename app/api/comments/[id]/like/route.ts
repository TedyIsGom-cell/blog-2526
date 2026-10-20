import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const comment = await prisma.comment.update({
    where: { id: Number(params.id) },
    data: { likeCount: { increment: 1 } },
  });

  return NextResponse.json({ likeCount: comment.likeCount });
}
