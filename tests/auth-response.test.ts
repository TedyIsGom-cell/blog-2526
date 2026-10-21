import test from 'node:test';
import assert from 'node:assert/strict';
import { readAuthResponse } from '../lib/auth-response';

test('empty and non-JSON authentication errors show actionable HTTP status', async () => {
  await assert.rejects(readAuthResponse(new Response(null, { status: 500 }), '가입 실패'), /가입 실패 \(HTTP 500\)/);
  await assert.rejects(readAuthResponse(new Response('<html>private provider detail</html>', { status: 502 }), '가입 실패'), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /HTTP 502/);
    assert.equal(error.message.includes('private provider detail'), false);
    return true;
  });
});

test('valid authentication JSON keeps server messages without parsing errors', async () => {
  assert.deepEqual(await readAuthResponse(Response.json({ error: '설정 키를 확인해주세요.' }, { status: 403 }), '가입 실패'), { error: '설정 키를 확인해주세요.' });
  assert.deepEqual(await readAuthResponse(Response.json({ user: { id: 'u1' } }), '가입 실패'), { error: undefined });
});

test('non-object JSON and non-string errors never leak into the login UI', async () => {
  for (const value of [null, [], 'unexpected']) await assert.rejects(readAuthResponse(Response.json(value), '로그인 실패'), /HTTP 200/);
  assert.deepEqual(await readAuthResponse(Response.json({ error: { password: 'private' } }), '가입 실패'), { error: undefined });
});
