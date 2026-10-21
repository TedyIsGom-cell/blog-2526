import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGoogleAccount, type GoogleAccount, type GoogleAccountStore } from '../lib/google-accounts';
import { GoogleError } from '../lib/google-errors';
import { verifyPassword } from '../lib/auth';

type Member = GoogleAccount & { email: string; name: string; role: string; passwordHash: string; googleEmail: string | null; posts: number[] };
const identity = { subject: 'google-subject-123', email: 'other@gmail.com', name: '운영자' };
function memoryStore(initial: Member[] = []) {
  const members = new Map(initial.map(member => [member.id, { ...member }]));
  let writes = 0;
  const store: GoogleAccountStore = {
    findBySubject: async subject => Array.from(members.values()).find(member => member.googleSubject === subject) ?? null,
    findByEmail: async email => Array.from(members.values()).find(member => member.email === email) ?? null,
    findById: async id => members.get(id) ?? null,
    bind: async (id, google) => { writes++; const member = members.get(id)!; member.googleSubject = google.subject; member.googleEmail = google.email; },
    create: async data => { writes++; const member = { ...data, id: 'new-reader', posts: [] }; members.set(member.id, member); return member; },
  };
  return { store, members, writes: () => writes };
}
function legacy(overrides: Partial<Member> = {}): Member {
  return { id: 'owner', email: 'owner@naver.com', name: '기존 이름', role: 'ADMIN', passwordHash: 'existing-password', googleSubject: null, googleEmail: null, posts: [1, 2], ...overrides };
}
const code = (expected: string) => (error: unknown) => error instanceof GoogleError && error.code === expected;

test('an existing non-Gmail operator links without changing account, role, email or posts', async () => {
  const db = memoryStore([legacy()]);
  assert.equal(await resolveGoogleAccount(db.store, identity, { linkUserId: 'owner' }), 'owner');
  const member = db.members.get('owner')!;
  assert.equal(member.email, 'owner@naver.com');
  assert.equal(member.role, 'ADMIN');
  assert.equal(member.passwordHash, 'existing-password');
  assert.deepEqual(member.posts, [1, 2]);
  assert.equal(member.googleSubject, identity.subject);
  assert.equal(member.googleEmail, identity.email);
});
test('an email match never automatically connects an existing member', async () => {
  const db = memoryStore([legacy({ email: identity.email })]);
  await assert.rejects(resolveGoogleAccount(db.store, identity), code('existing_account'));
  assert.equal(db.writes(), 0);
});
test('Google identity cannot be taken from another member or silently replaced', async () => {
  const db = memoryStore([legacy(), legacy({ id: 'other', googleSubject: identity.subject, email: 'second@naver.com' })]);
  await assert.rejects(resolveGoogleAccount(db.store, identity, { linkUserId: 'owner' }), code('already_linked'));
  const second = memoryStore([legacy({ googleSubject: 'different-subject' })]);
  await assert.rejects(resolveGoogleAccount(second.store, identity, { linkUserId: 'owner' }), code('already_linked'));
  assert.equal(db.writes() + second.writes(), 0);
});
test('Google sign-in uses subject even when Google email has changed', async () => {
  const db = memoryStore([legacy({ googleSubject: identity.subject })]);
  assert.equal(await resolveGoogleAccount(db.store, identity), 'owner');
  assert.equal(db.writes(), 0);
});
test('new Google members are readers and cannot use a manufactured password', async () => {
  const db = memoryStore();
  assert.equal(await resolveGoogleAccount(db.store, identity), 'new-reader');
  const member = db.members.get('new-reader')!;
  assert.equal(member.role, 'READER');
  assert.equal(await verifyPassword('anything', member.passwordHash), false);
  assert.deepEqual(member.posts, []);
});
test('reserved administrator email does not grant privilege or create a duplicate', async () => {
  const db = memoryStore();
  await assert.rejects(resolveGoogleAccount(db.store, identity, { reservedAdminEmail: identity.email.toUpperCase() }), code('admin_link_required'));
  assert.equal(db.writes(), 0);
});
test('deleted local accounts cannot receive a Google connection', async () => {
  const db = memoryStore();
  await assert.rejects(resolveGoogleAccount(db.store, identity, { linkUserId: 'gone' }), code('reauth_required'));
});
