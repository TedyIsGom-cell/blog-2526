import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml, excerpt, weeklyIssueKey, canRetry, buildDigest } from '../lib/newsletter-utils';
import { emailConfiguration, secretMatches } from '../lib/email';

test('Korean Monday week boundary is stable across UTC midnight', () => {
  assert.equal(weeklyIssueKey(new Date('2026-10-18T23:59:59Z')), 'weekly:2026-10-12');
  assert.equal(weeklyIssueKey(new Date('2026-10-19T00:00:00Z')), 'weekly:2026-10-19');
  assert.equal(weeklyIssueKey(new Date('2026-10-20T15:55:00Z')), 'weekly:2026-10-19');
});

test('digest escapes user titles and names and omits raw HTML from excerpts', () => {
  const digest = buildDigest([{ id: 8, title: '<img src=x onerror=alert(1)>', content: '<script>bad()</script> **words**', author: { name: '<Admin>' } }], 'https://example.com');
  assert.equal(digest.html.includes('<img'), false);
  assert.equal(digest.html.includes('<script>'), false);
  assert.match(digest.html, /&lt;Admin&gt;/);
  assert.match(digest.html, /https:\/\/example.com\/posts\/8/);
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(excerpt('![private](https://img.test) [link](https://test) **hello**'), 'link hello');
});

test('unknown attempts cannot retry beyond provider idempotency window', () => {
  const now = new Date('2026-10-21T00:00:00Z');
  assert.equal(canRetry(null, now), true);
  assert.equal(canRetry(new Date('2026-10-20T02:00:00Z'), now), true);
  assert.equal(canRetry(new Date('2026-10-20T01:00:00Z'), now), false);
});

test('cron authentication fails closed without configuration', () => {
  assert.equal(secretMatches('Bearer abc', undefined), false);
  assert.equal(secretMatches(null, 'Bearer abc'), false);
  assert.equal(secretMatches('Bearer abc', 'Bearer abd'), false);
  assert.equal(secretMatches('Bearer abc', 'Bearer abc'), true);
});

test('mail configuration rejects non-HTTPS and injected URL credentials', () => {
  const previous = process.env.SITE_URL;
  process.env.SITE_URL = 'http://example.com';
  assert.equal(emailConfiguration().siteUrl, '');
  process.env.SITE_URL = 'https://user:secret@example.com';
  assert.equal(emailConfiguration().siteUrl, '');
  if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous;
});


test('newsletter timestamps use each author birthday without exposing raw dates', () => {
  const digest = buildDigest([
    { id: 1, title: '첫 글', content: '본문', createdAt: '2000-01-02T00:00:00+09:00', author: { name: '가', birthDate: '2000-01-01' } },
    { id: 2, title: '다른 글', content: '본문', createdAt: '2000-01-02T00:00:00+09:00', author: { name: '나', birthDate: '2000-01-02' } },
  ], 'https://example.com');
  assert.match(digest.text, /\(2 일\)/);
  assert.match(digest.text, /\(1 일\)/);
  assert.equal(digest.html.includes('2000-01-01'), false);
});
