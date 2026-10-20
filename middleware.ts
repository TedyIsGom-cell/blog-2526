import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a navigation hint only. Every protected page and API independently
// validates the database session and current role in the Node runtime.
export function middleware(request: NextRequest) {
  if (!request.cookies.get('blog_session')?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/admin/write/:path*', '/admin/edit/:path*', '/admin/dashboard/:path*', '/admin/categories/:path*', '/admin/users/:path*', '/admin/newsletter/:path*', '/account/:path*'] };
