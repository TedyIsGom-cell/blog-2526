import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireUser } from '@/lib/server-auth';
export async function POST(req: Request) {
  const actor = await requireUser(req, ['ADMIN', 'WRITER']);
  if (actor instanceof Response) return actor;
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  // Exclude scriptable SVG and HTML even if the supplied name looks like an image.
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'].includes(file.type) || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: '8MB 이하의 JPG, PNG, GIF, WebP, AVIF 이미지를 선택해주세요.' }, { status: 400 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '').slice(-100) || 'image';
  const blob = await put(`uploads/${randomUUID()}-${safeName}`, file, { access: 'public', contentType: file.type });
  return NextResponse.json({ url: blob.url });
}
