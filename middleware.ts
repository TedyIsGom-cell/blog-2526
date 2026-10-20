import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  const valid = await isValidSession(token);
  if (!valid) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/write/:path*', '/admin/edit/:path*', '/admin/dashboard/:path*', '/admin/categories/:path*'],
};
