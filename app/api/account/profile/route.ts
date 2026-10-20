import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, userSelect } from '@/lib/server-auth';
import { validateBirthDate } from '@/lib/birthdays';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.prototype.hasOwnProperty.call(body, 'birthDate')) {
    return NextResponse.json({ error: '변경할 생일을 입력해주세요.' }, { status: 400 });
  }
  const { date: birthDate, error } = validateBirthDate(body.birthDate);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { birthDate }, select: userSelect });
  return NextResponse.json({ user: updated }, { headers: { 'Cache-Control': 'no-store' } });
}
