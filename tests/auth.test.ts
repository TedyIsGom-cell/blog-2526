import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, randomToken, sessionTokenHash, safeEqual, getSessionTokenFromRequest } from '../lib/auth';
import { canEditPost, canWrite, isAdmin, type Role } from '../lib/permissions';

test('password hashes use fresh salts and reject wrong/malformed passwords', async () => {
  const first = await hashPassword('a-long-valid-password');
  const second = await hashPassword('a-long-valid-password');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('a-long-valid-password', first), true);
  assert.equal(await verifyPassword('a-different-password', first), false);
  assert.equal(await verifyPassword('a-long-valid-password', 'scrypt$invalid$bad'), false);
});
test('session tokens are random 256-bit values stored by hash', () => {
  const a = randomToken(); const b = randomToken();
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(sessionTokenHash(a), a);
  assert.notEqual(sessionTokenHash(a), sessionTokenHash(b));
  assert.equal(getSessionTokenFromRequest(new Request('https://blog.test', { headers: { cookie: `other=1; blog_session=${a}; later=2` } })), a);
  assert.equal(getSessionTokenFromRequest(new Request('https://blog.test', { headers: { cookie: `admin_session=${a}` } })), undefined);
  assert.equal(safeEqual('secret', 'secret'), true);
  assert.equal(safeEqual('secret', 'other'), false);
});
test('permission matrix denies readers and prevents writers editing others/legacy posts', () => {
  const roles: Role[] = ['READER', 'WRITER', 'ADMIN'];
  for (const role of roles) {
    const user = { id: 'alice', role };
    assert.equal(canWrite(user), role !== 'READER');
    assert.equal(isAdmin(user), role === 'ADMIN');
    assert.equal(canEditPost(user, 'alice'), role !== 'READER');
    assert.equal(canEditPost(user, 'bob'), role === 'ADMIN');
    assert.equal(canEditPost(user, null), role === 'ADMIN');
  }
  assert.equal(canWrite(null), false);
  assert.equal(canEditPost(null, null), false);
});
