import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { safeEqual } from './auth';
import { GoogleError } from './google-errors';
import type { GoogleIdentity } from './google-identity';

export { GoogleError } from './google-errors';

export type GoogleConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  origin: string;
};

export type { GoogleIdentity } from './google-identity';

const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  timeoutDuration: 10_000,
});

/** Callback URLs come only from the configured site, never the request Host. */
export function googleConfig(): GoogleConfiguration | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const site = process.env.SITE_URL?.trim();
  if (!clientId || !clientSecret || !site || clientId.length > 2048 || clientSecret.length > 2048 || /\s/.test(clientId + clientSecret)) return null;

  try {
    const url = new URL(site);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const validProtocol = url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:');
    if (!validProtocol || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    const origin = url.origin;
    return { clientId, clientSecret, origin, redirectUri: `${origin}/api/auth/google/callback` };
  } catch {
    return null;
  }
}

export function createGoogleAuthorization(
  config: GoogleConfiguration,
  flow: { state: string; nonce: string; codeVerifier: string },
): string {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash('sha256').update(flow.codeVerifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

/** Verify identity using Google's signed subject, not an email-based match. */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  nonce: string,
  keySet: JWTVerifyGetKey = googleKeys,
): Promise<GoogleIdentity> {
  if (!idToken || idToken.length > 16_384 || !clientId || !nonce) throw new GoogleError('google_invalid');
  try {
    const { payload } = await jwtVerify(idToken, keySet, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
      requiredClaims: ['sub', 'iss', 'aud', 'exp', 'iat', 'nonce', 'email', 'email_verified'],
    });
    if (typeof payload.nonce !== 'string' || !safeEqual(payload.nonce, nonce)) throw new GoogleError('google_invalid');
    if (payload.azp !== undefined && payload.azp !== clientId) throw new GoogleError('google_invalid');
    if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId) throw new GoogleError('google_invalid');
    if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat) || payload.iat > Date.now() / 1000 + 60) throw new GoogleError('google_invalid');
    if (typeof payload.sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(payload.sub)) throw new GoogleError('google_invalid');
    if (payload.email_verified !== true) throw new GoogleError('google_unverified');
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GoogleError('google_invalid');
    const suppliedName = typeof payload.name === 'string' ? payload.name.trim() : '';
    const name = (suppliedName || email.split('@')[0] || '독자').slice(0, 80);
    return { subject: payload.sub, email, name };
  } catch (error) {
    if (error instanceof GoogleError) throw error;
    throw new GoogleError('google_invalid');
  }
}

export async function exchangeGoogleCode(
  config: GoogleConfiguration,
  flow: { code: string; codeVerifier: string; nonce: string },
): Promise<GoogleIdentity> {
  if (!flow.code || flow.code.length > 4096 || !/^[A-Za-z0-9._~-]{43,128}$/.test(flow.codeVerifier) || !flow.nonce) throw new GoogleError('google_invalid');

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: flow.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: flow.codeVerifier,
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new GoogleError('google_unavailable');
  }
  if (!response.ok) throw new GoogleError('google_invalid');
  let body: unknown;
  try { body = await response.json(); } catch { throw new GoogleError('google_invalid'); }
  if (!body || typeof body !== 'object' || !('id_token' in body) || typeof body.id_token !== 'string') throw new GoogleError('google_invalid');
  return verifyGoogleIdToken(body.id_token, config.clientId, flow.nonce);
}
