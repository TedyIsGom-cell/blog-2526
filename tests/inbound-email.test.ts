import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import test from 'node:test';
import {
  hashSubmissionToken, InvalidSubmissionError, isAuthenticatedSender, MAX_EMAIL_TEXT_LENGTH,
  newSubmissionCredential, normalizeSubmissionDomain, parseMailbox, parseSubmissionEmail,
  readLimitedText, submissionTokenFromRecipients, verifyInboundWebhook,
} from '../lib/inbound-email';

const token = 'a'.repeat(48);
const email = { id: '12345678-abcd', from: 'Writer <writer@example.com>', to: [`submit+${token}@inbound.example.com`], subject: '첫 글', text: '본문입니다.\r\n다음 줄', authentication: { dkim: 'pass', dmarc: 'pass' } };

test('recipient tokens match the exact configured domain and have unambiguous ownership', () => {
  assert.equal(submissionTokenFromRecipients(email.to, 'inbound.example.com'), token);
  assert.equal(submissionTokenFromRecipients([`submit+${token}@inbound.example.com.evil.test`], 'inbound.example.com'), null);
  assert.equal(submissionTokenFromRecipients([`submit+short@inbound.example.com`], 'inbound.example.com'), null);
  assert.equal(submissionTokenFromRecipients([...email.to, `submit+${'b'.repeat(48)}@inbound.example.com`], 'inbound.example.com'), null);
  assert.equal(submissionTokenFromRecipients([email.to[0], email.to[0]], 'inbound.example.com'), token);
});

test('credentials are random capabilities and only their hash is retained', () => {
  const first = newSubmissionCredential('inbound.example.com');
  const second = newSubmissionCredential('inbound.example.com');
  assert.notEqual(first.address, second.address);
  const actual = submissionTokenFromRecipients([first.address], 'inbound.example.com')!;
  assert.equal(first.tokenHash, hashSubmissionToken(actual));
  assert.equal(first.tokenHint, actual.slice(-6));
  assert.equal(actual.length, 48);
});

test('plain text is normalized and empty, HTML-only or oversized submissions are rejected', () => {
  assert.deepEqual(parseSubmissionEmail(email), { title: '첫 글', content: '본문입니다.\n다음 줄', category: '이메일 투고' });
  assert.throws(() => parseSubmissionEmail({ ...email, text: null }), InvalidSubmissionError);
  assert.throws(() => parseSubmissionEmail({ ...email, subject: 'title\nBcc: someone@example.com' }), InvalidSubmissionError);
  assert.throws(() => parseSubmissionEmail({ ...email, text: 'a'.repeat(MAX_EMAIL_TEXT_LENGTH + 1) }), InvalidSubmissionError);
});

test('sender identity requires receiving-server DMARC or aligned DKIM success', () => {
  assert.equal(parseMailbox('WRITER <Writer@Example.com>'), 'writer@example.com');
  assert.equal(parseMailbox('writer@example.com\nBcc: victim@example.com'), null);
  assert.equal(isAuthenticatedSender({ ...email, authentication: null }), false);
  assert.equal(isAuthenticatedSender({ ...email, authentication: { spf: 'pass', dkim: 'fail', dmarc: 'fail' } }), false);
  assert.equal(isAuthenticatedSender({ ...email, authentication: { dkim: 'pass', dmarc: 'gray' } }), true);
  assert.equal(isAuthenticatedSender({ ...email, authentication: { spf: 'pass', dmarc: 'pass' } }), true);
});

test('only valid DNS domains are accepted', () => {
  assert.equal(normalizeSubmissionDomain(' Inbound.Example.com '), 'inbound.example.com');
  assert.equal(normalizeSubmissionDomain('https://inbound.example.com'), null);
  assert.equal(normalizeSubmissionDomain('example.com/path'), null);
  assert.equal(normalizeSubmissionDomain('-invalid.example.com'), null);
});

test('signature verification rejects tampering and old replays', () => {
  const bytes = randomBytes(32);
  const secret = `whsec_${bytes.toString('base64')}`;
  const payload = JSON.stringify({ type: 'email.received', data: { email_id: email.id } });
  function headers(timestamp: number) {
    const id = 'msg_test';
    const signature = createHmac('sha256', bytes).update(`${id}.${timestamp}.${payload}`).digest('base64');
    return new Headers({ 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${signature}` });
  }
  const now = Math.floor(Date.now() / 1000);
  assert.deepEqual(verifyInboundWebhook(payload, headers(now), secret), JSON.parse(payload));
  assert.throws(() => verifyInboundWebhook(payload.replace('email.received', 'email.sent'), headers(now), secret));
  assert.throws(() => verifyInboundWebhook(payload, headers(now - 3600), secret));
  assert.throws(() => verifyInboundWebhook(payload, headers(now + 3600), secret));
  const multiple = headers(now);
  multiple.set('svix-signature', `v2,ignored v1,${Buffer.alloc(32).toString('base64')} ${multiple.get('svix-signature')}`);
  assert.deepEqual(verifyInboundWebhook(payload, multiple, secret), JSON.parse(payload));
  assert.throws(() => verifyInboundWebhook(payload, new Headers(), secret));
});

test('signature implementation matches Svix official independent example', () => {
  const payload = '{"event_type":"ping","data":{"success":true}}';
  const headers = new Headers({ 'svix-id': 'msg_loFOjxBNrRLzqYUf', 'svix-timestamp': '1731705121', 'svix-signature': 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=' });
  assert.deepEqual(verifyInboundWebhook(payload, headers, 'whsec_plJ3nmyCDGBKInavdOK15jsl', 1731705121), JSON.parse(payload));
});

test('request and provider bodies have enforced byte limits even without Content-Length', async () => {
  assert.equal(await readLimitedText(new Response('hello'), 5), 'hello');
  await assert.rejects(readLimitedText(new Response('oversized'), 3), InvalidSubmissionError);
  await assert.rejects(readLimitedText(new Response('a', { headers: { 'Content-Length': '99999' } }), 10), InvalidSubmissionError);
});
