import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { createGoogleAuthorization, exchangeGoogleCode, GoogleError, googleConfig, verifyGoogleIdToken } from '../lib/google-oidc';

const clientId = 'test-client.apps.googleusercontent.com';
const nonce = 'one-time-nonce-with-enough-entropy';
const config = {
  clientId,
  clientSecret: 'test-client-secret',
  origin: 'https://blog.example.com',
  redirectUri: 'https://blog.example.com/api/auth/google/callback',
};

const keys = (async () => {
  const pair = await generateKeyPair('RS256');
  const jwk = await exportJWK(pair.publicKey);
  return { ...pair, resolver: createLocalJWKSet({ keys: [{ ...jwk, kid: 'google-test-key', alg: 'RS256', use: 'sig' }] }) };
})();

async function token(changes: JWTPayload = {}) {
  const { privateKey } = await keys;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: 'google-subject-123', iss: 'https://accounts.google.com', aud: clientId,
    iat: now, exp: now + 3600, nonce, email: 'User@Example.COM', email_verified: true,
    name: '기존 운영자', ...changes,
  }).setProtectedHeader({ alg: 'RS256', kid: 'google-test-key' }).sign(privateKey);
}

test('Google config accepts only canonical secure sites and keeps secrets off the redirect', () => {
  const previous = { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET, SITE_URL: process.env.SITE_URL, NODE_ENV: process.env.NODE_ENV };
  try {
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = config.clientSecret;
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.SITE_URL = 'https://blog.example.com/';
    assert.deepEqual(googleConfig(), config);
    for (const site of ['http://blog.example.com', 'https://user:secret@blog.example.com', 'https://blog.example.com/?next=evil', 'https://blog.example.com/path', 'not a URL', 'http://localhost:3000']) {
      process.env.SITE_URL = site;
      assert.equal(googleConfig(), null);
    }
    Object.assign(process.env, { NODE_ENV: 'development' });
    process.env.SITE_URL = 'http://localhost:3000';
    assert.equal(googleConfig()?.redirectUri, 'http://localhost:3000/api/auth/google/callback');
    delete process.env.GOOGLE_CLIENT_SECRET;
    assert.equal(googleConfig(), null);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('Google authorization binds state and nonce with S256 PKCE and minimal identity scopes', () => {
  const codeVerifier = 'v'.repeat(64);
  const url = new URL(createGoogleAuthorization(config, { state: 'random-state', nonce, codeVerifier }));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('redirect_uri'), config.redirectUri);
  assert.equal(url.searchParams.get('state'), 'random-state');
  assert.equal(url.searchParams.get('nonce'), nonce);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(codeVerifier).digest('base64url'));
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.has('client_secret'), false);
  assert.equal(url.searchParams.has('access_type'), false);
});

test('Google signed subject stays the identity while email is normalized', async () => {
  const { resolver } = await keys;
  assert.deepEqual(await verifyGoogleIdToken(await token(), clientId, nonce, resolver), {
    subject: 'google-subject-123', email: 'user@example.com', name: '기존 운영자',
  });
  assert.equal((await verifyGoogleIdToken(await token({ iss: 'accounts.google.com', name: '' }), clientId, nonce, resolver)).name, 'user');
});

test('Google verification rejects wrong issuer, audience, nonce, expired and missing expiration claims', async () => {
  const { resolver } = await keys;
  const now = Math.floor(Date.now() / 1000);
  for (const changes of [
    { iss: 'https://attacker.example.com' }, { aud: 'other-client' }, { nonce: 'wrong-nonce' },
    { exp: now - 10 }, { exp: undefined }, { iat: now + 600 }, { sub: '' },
    { sub: 'x'.repeat(256) }, { email: 'not-an-email' }, { azp: 'other-client' },
    { aud: [clientId, 'other-client'], azp: undefined },
  ]) {
    await assert.rejects(verifyGoogleIdToken(await token(changes), clientId, nonce, resolver), (error: unknown) => error instanceof GoogleError && error.code === 'google_invalid');
  }
});

test('Google verification rejects forged signatures and unverified email claims', async () => {
  const { resolver } = await keys;
  const attacker = await generateKeyPair('RS256');
  const forged = await new SignJWT({ iss: 'https://accounts.google.com', aud: clientId, sub: 'google-subject-123', nonce, email: 'user@example.com', email_verified: true }).setProtectedHeader({ alg: 'RS256', kid: 'google-test-key' }).setIssuedAt().setExpirationTime('1h').sign(attacker.privateKey);
  await assert.rejects(verifyGoogleIdToken(forged, clientId, nonce, resolver), GoogleError);
  for (const email_verified of [false, 'true']) {
    await assert.rejects(verifyGoogleIdToken(await token({ email_verified }), clientId, nonce, resolver), (error: unknown) => error instanceof GoogleError && error.code === 'google_unverified');
  }
});

test('Google exchange sends credentials only to the fixed token endpoint and does not follow redirects', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  try {
    globalThis.fetch = async (input, init) => {
      called = true;
      assert.equal(input, 'https://oauth2.googleapis.com/token');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.redirect, 'error');
      assert.equal(init?.cache, 'no-store');
      const body = init?.body as URLSearchParams;
      assert.equal(body.get('client_secret'), config.clientSecret);
      assert.equal(body.get('redirect_uri'), config.redirectUri);
      assert.equal(body.get('code_verifier'), 'v'.repeat(64));
      return Response.json({});
    };
    await assert.rejects(exchangeGoogleCode(config, { code: 'authorization-code', codeVerifier: 'v'.repeat(64), nonce }), GoogleError);
    assert.equal(called, true);
    called = false;
    await assert.rejects(exchangeGoogleCode(config, { code: 'authorization-code', codeVerifier: 'too-short', nonce }), GoogleError);
    assert.equal(called, false);
    globalThis.fetch = async () => { throw new Error('network diagnostics must not escape'); };
    await assert.rejects(exchangeGoogleCode(config, { code: 'authorization-code', codeVerifier: 'v'.repeat(64), nonce }), (error: unknown) => error instanceof GoogleError && error.code === 'google_unavailable' && !error.message.includes('diagnostics'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
