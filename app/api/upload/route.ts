import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isValidSession, getSessionTokenFromRequest } from '@/lib/auth';

export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: '이미지 파일만 업로드할 수 있어요.' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
  const blob = await put(`uploads/${Date.now()}-${safeName}`, file, {
    access: 'public',
  });

  return NextResponse.json({ url: blob.url });
}
