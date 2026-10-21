import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password && password === process.env.ADMIN_PASSWORD) {
    const token = await createSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7일 유지
    });
    return res;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('admin_session');
  return res;
}
