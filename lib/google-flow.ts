import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from './db';
import { randomToken, safeEqual, sessionTokenHash, getSessionTokenFromRequest } from './auth';
import { createGoogleAuthorization, type GoogleConfiguration } from './google-oidc';
import { GoogleError } from './google-errors';

const FLOW_COOKIE = 'blog_google_flow';
const FLOW_SECONDS = 10 * 60;
const COOKIE_PATH = '/api/auth/google';

export function readFlowCookie(req: Request): string | undefined {
  return req.headers.get('cookie')?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${FLOW_COOKIE}=`))?.slice(FLOW_COOKIE.length + 1);
}

export function clearFlowCookie(res: NextResponse, config: GoogleConfiguration | null) {
  res.cookies.set(FLOW_COOKIE, '', {
    path: COOKIE_PATH, httpOnly: true, secure: config?.origin.startsWith('https:') ?? process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 0,
  });
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
}

export async function beginGoogleFlow(
  req: Request,
  config: GoogleConfiguration,
  mode: 'login' | 'link',
  userId?: string,
) {
  const state = randomToken();
  const browserToken = randomToken();
  const codeVerifier = randomBytes(32).toString('base64url');
  const nonce = randomToken();
  const sessionToken = getSessionTokenFromRequest(req);
  if (mode === 'link' && (!userId || !sessionToken)) throw new GoogleError('reauth_required');
  const now = new Date();
  await prisma.googleAuthFlow.deleteMany({ where: { expiresAt: { lte: now } } });
  await prisma.googleAuthFlow.create({ data: {
    stateHash: sessionTokenHash(state), browserHash: sessionTokenHash(browserToken), codeVerifier, nonce, mode,
    userId: mode === 'link' ? userId : null,
    sessionHash: mode === 'link' ? sessionTokenHash(sessionToken!) : null,
    expiresAt: new Date(now.getTime() + FLOW_SECONDS * 1000),
  } });
  return {
    url: createGoogleAuthorization(config, { state, nonce, codeVerifier }),
    attachCookie(res: NextResponse) {
      res.cookies.set(FLOW_COOKIE, browserToken, {
        path: COOKIE_PATH, httpOnly: true, secure: config.origin.startsWith('https:'), sameSite: 'lax', maxAge: FLOW_SECONDS,
      });
      res.headers.set('Cache-Control', 'no-store');
      res.headers.set('Referrer-Policy', 'no-referrer');
      return res;
    },
  };
}

/** The matching browser must atomically consume state before any code exchange. */
export async function consumeGoogleFlow(req: Request, state: string | null) {
  const browserToken = readFlowCookie(req);
  if (!state || !/^[a-f0-9]{64}$/.test(state) || !browserToken || !/^[a-f0-9]{64}$/.test(browserToken)) {
    throw new GoogleError('state');
  }
  const stateHash = sessionTokenHash(state);
  const flow = await prisma.googleAuthFlow.findUnique({ where: { stateHash } });
  const now = new Date();
  if (!flow || !safeEqual(flow.browserHash, sessionTokenHash(browserToken)) || flow.expiresAt <= now) throw new GoogleError('state');
  const consumed = await prisma.googleAuthFlow.deleteMany({ where: {
    stateHash, browserHash: flow.browserHash, expiresAt: { gt: now },
  } });
  if (consumed.count !== 1 || !['login', 'link'].includes(flow.mode)) throw new GoogleError('state');
  return flow;
}
