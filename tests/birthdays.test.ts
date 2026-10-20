import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBirthDate, validateBirthDate } from '../lib/birthdays';

const now = new Date('2026-10-20T15:00:00Z'); // October 21 in Korea.
test('optional birthdays can be omitted or cleared', () => {
  for (const value of [undefined, null, '']) assert.deepEqual(validateBirthDate(value, now), { date: null });
});
test('birthdays require strict existing civil dates including leap-year rules', () => {
  assert.equal(formatBirthDate(validateBirthDate('2000-02-29', now).date), '2000-02-29');
  for (const value of ['1900-02-29', '2024-02-30', '2007-00-21', '2007-13-21', '2007-01-00', '0000-01-01', '2007-1-21', '2007-01-21T00:00:00Z', 20070121, {}]) {
    assert.ok(validateBirthDate(value, now).error, String(value));
  }
});
test('future birthdays use the Korean calendar date and never the server timezone', () => {
  assert.equal(validateBirthDate('2026-10-21', now).error, undefined);
  assert.ok(validateBirthDate('2026-10-22', now).error);
  assert.ok(validateBirthDate('2026-10-21', new Date('2026-10-20T14:59:59Z')).error);
});
test('birth date serialization is timezone independent and handles missing values', () => {
  assert.equal(formatBirthDate(new Date('2007-01-21T00:00:00Z')), '2007-01-21');
  assert.equal(formatBirthDate('2007-01-21'), '2007-01-21');
  assert.equal(formatBirthDate(null), null);
  assert.equal(formatBirthDate('not a date'), null);
});
