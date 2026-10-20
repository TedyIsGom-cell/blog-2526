import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/server-auth';

export async function POST(req: Request) {
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;

  await prisma.siteStat.upsert({
    where: { id: 1 },
    update: { lastSeenCommentAt: new Date() },
    create: { id: 1, lastSeenCommentAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
