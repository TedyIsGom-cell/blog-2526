import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser, memberSelect } from '@/lib/server-auth';
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  const actor = await requireUser(req, ['ADMIN']);
  if (actor instanceof Response) return actor;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '입력 형식을 확인해주세요.' }, { status: 400 });
  if (!['READER', 'WRITER', 'ADMIN'].includes(body.role)) return NextResponse.json({ error: '올바른 직책을 선택해주세요.' }, { status: 400 });
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(842107)::text AS locked`;
    const currentActor = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } });
    if (currentActor?.role !== 'ADMIN') return { error: '관리자 권한이 필요합니다.', status: 403 };
    const target = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return { error: '회원을 찾을 수 없습니다.', status: 404 };
    if (target.role === 'ADMIN' && body.role !== 'ADMIN' && await tx.user.count({ where: { role: 'ADMIN' } }) <= 1) return { error: '마지막 관리자의 직책은 변경할 수 없습니다.', status: 409 };
    const user = await tx.user.update({ where: { id: userId }, data: { role: body.role as UserRole }, select: memberSelect });
    return { user };
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
