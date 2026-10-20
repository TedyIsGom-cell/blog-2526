import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server-auth';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  return NextResponse.json({ user: await getCurrentUser(req) }, { headers: { 'Cache-Control': 'no-store' } });
}
