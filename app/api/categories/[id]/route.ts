import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { name: newName } = await req.json();
  if (!newName?.trim()) {
    return NextResponse.json({ error: '새 카테고리 이름을 입력해주세요.' }, { status: 400 });
  }

  const id = Number(params.id);
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });
  }

  const trimmedNewName = newName.trim();
  const existingTarget = await prisma.category.findUnique({ where: { name: trimmedNewName } });

  if (existingTarget && existingTarget.id !== id) {
    // 이미 있는 카테고리로 옮기기(병합): 글들을 옮기고 기존(현재) 카테고리는 삭제
    await prisma.post.updateMany({
      where: { category: current.name },
      data: { category: trimmedNewName },
    });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ merged: true, name: trimmedNewName });
  }

  // 새 이름으로 단순 이름 변경
  await prisma.post.updateMany({
    where: { category: current.name },
    data: { category: trimmedNewName },
  });
  const updated = await prisma.category.update({
    where: { id },
    data: { name: trimmedNewName },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const id = Number(params.id);
  const current = await prisma.category.findUnique({
    where: { id },
    include: { children: true },
  });
  if (!current) {
    return NextResponse.json({ error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (current.children.length > 0) {
    return NextResponse.json(
      { error: '하위 카테고리가 있는 카테고리는 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제하거나 옮겨주세요.' },
      { status: 400 }
    );
  }

  if (current.name === '일반') {
    return NextResponse.json({ error: "'일반' 카테고리는 삭제할 수 없습니다." }, { status: 400 });
  }

  // 이 카테고리에 속한 글들은 '일반'으로 이동시킵니다.
  await prisma.category.upsert({
    where: { name: '일반' },
    update: {},
    create: { name: '일반' },
  });
  await prisma.post.updateMany({
    where: { category: current.name },
    data: { category: '일반' },
  });
  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
