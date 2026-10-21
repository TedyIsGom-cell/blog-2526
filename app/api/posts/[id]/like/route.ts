import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const post = await prisma.post.update({
    where: { id: Number(params.id) },
    data: { likeCount: { increment: 1 } },
  });

  return NextResponse.json({ likeCount: post.likeCount });
}
