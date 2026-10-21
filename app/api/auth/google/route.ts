import { NextResponse } from 'next/server';
import { googleConfig } from '@/lib/google-oidc';
import { beginGoogleFlow, clearFlowCookie } from '@/lib/google-flow';
import { getCurrentUser, authThrottleKey, consumeAuthAttempt } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const config = googleConfig();
  const origin = config?.origin || new URL(req.url).origin;
  try {
    if (!config) return NextResponse.redirect(new URL('/login?google_error=not_configured', origin));
    if (await getCurrentUser(req)) return NextResponse.redirect(new URL('/account', origin));
    if (!await consumeAuthAttempt(authThrottleKey(req, 'google-login'), 25)) {
      return NextResponse.redirect(new URL('/login?google_error=failed', origin));
    }
    const flow = await beginGoogleFlow(req, config, 'login');
    return flow.attachCookie(NextResponse.redirect(flow.url));
  } catch {
    const response = NextResponse.redirect(new URL('/login?google_error=failed', origin));
    clearFlowCookie(response, config);
    return response;
  }
}
