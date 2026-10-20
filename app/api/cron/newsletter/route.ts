import { NextResponse } from 'next/server';
import { secretMatches } from '@/lib/email';
import { dispatchNewsletter } from '@/lib/newsletter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!secretMatches(req.headers.get('authorization'), process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  const result = await dispatchNewsletter();
  return NextResponse.json(result, { status: result.configured ? 200 : 503 });
}
