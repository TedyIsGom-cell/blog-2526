import test from 'node:test';
import assert from 'node:assert/strict';
import { daysOldAt, formatDateAndAgeDays, formatDateWithAge } from '../lib/format';

test('birth day is day one and changes at Korean midnight, not UTC midnight', () => {
  assert.equal(daysOldAt('2000-01-01', '1999-12-31T14:59:59Z'), null);
  assert.equal(daysOldAt('2000-01-01', '1999-12-31T15:00:00Z'), 1);
  assert.equal(daysOldAt('2000-01-01', '2000-01-01T14:59:59Z'), 1);
  assert.equal(daysOldAt('2000-01-01', '2000-01-01T15:00:00Z'), 2);
});

test('each author gets their own age on the original writing date', () => {
  const timestamp = '2026-10-20T15:00:00Z';
  assert.equal(daysOldAt('2000-01-01', timestamp)! - daysOldAt('2001-01-01', timestamp)!, 366);
  assert.equal(daysOldAt(new Date('2000-01-01T00:00:00Z'), timestamp), daysOldAt('2000-01-01', timestamp));
  assert.equal(daysOldAt('2000-01-01T00:00:00.000Z', timestamp), daysOldAt('2000-01-01', timestamp));
});

test('leap days, missing or invalid birthdays never use the old owner birthday', () => {
  assert.equal(daysOldAt('2000-02-29', '2000-03-01T00:00:00+09:00'), 2);
  for (const birth of [null, undefined, '2001-02-29', '2000-02-30', '2000-13-01', 'invalid']) assert.equal(daysOldAt(birth, new Date()), null);
  assert.equal(daysOldAt('2000-01-01', 'invalid'), null);
});

test('post and comment timestamp helpers share the requested format', () => {
  const date = '2000-01-02T00:00:00+09:00';
  assert.match(formatDateWithAge(date, '2000-01-01'), /\(2 일\)$/);
  assert.equal(formatDateWithAge(date, '2000-01-01'), formatDateAndAgeDays(date, 2));
  assert.match(formatDateWithAge(date), /\(생일 미등록\)$/);
});
