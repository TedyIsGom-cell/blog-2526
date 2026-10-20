import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, memberSelect } from '@/lib/server-auth';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;
  const users = await prisma.user.findMany({ select: memberSelect, orderBy: { createdAt: 'asc' }, take: 500 });
  return NextResponse.json({ users }, { headers: { 'Cache-Control': 'no-store' } });
}
