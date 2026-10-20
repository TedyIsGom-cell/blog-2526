import test from 'node:test';
import assert from 'node:assert/strict';
import { safeContentUrl } from '../lib/content-urls';

test('collaborative posts reject executable and obfuscated links', () => {
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>', '//host.test', '/\\host.test', 'file:///etc/passwd']) {
    assert.equal(safeContentUrl(url), null, url);
  }
});

test('normal web links, local paths and email links remain usable', () => {
  for (const url of ['https://example.com/글', '/posts/123', 'mailto:author@example.com']) assert.equal(safeContentUrl(url), url);
  assert.equal(safeContentUrl('mailto:author@example.com', true), null);
});
