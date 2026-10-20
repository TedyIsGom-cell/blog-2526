import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeComment } from '../lib/comments';

const comment = {
  id: 7, author: '집필자', content: '댓글', createdAt: new Date('2026-10-20T16:00:00Z'),
  updatedAt: new Date('2026-10-20T16:00:00Z'), likeCount: 0, parentId: null,
  user: { birthDate: new Date('2026-10-20T00:00:00Z') },
};
test('comment ages use the linked member and expose neither birth dates nor private fields', () => {
  const result = serializeComment({ ...comment, password: 'private', userId: 'secret-member-id' } as typeof comment);
  assert.equal(result.ageDays, 2);
  assert.equal('user' in result, false);
  assert.equal('birthDate' in result, false);
  assert.equal('password' in result, false);
  assert.equal('userId' in result, false);
});
test('legacy comments and members without birthdays never borrow an operator birthday', () => {
  assert.equal(serializeComment({ ...comment, user: null }).ageDays, null);
  assert.equal(serializeComment({ ...comment, user: { birthDate: null } }).ageDays, null);
});
test('updating a profile birthday recomputes age at the original writing date', () => {
  assert.equal(serializeComment({ ...comment, user: { birthDate: new Date('2026-10-19T00:00:00Z') } }).ageDays, 3);
  assert.equal(serializeComment({ ...comment, user: { birthDate: new Date('2026-10-22T00:00:00Z') } }).ageDays, null);
});
