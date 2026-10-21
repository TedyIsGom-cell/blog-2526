import { randomToken } from './auth';
import { GoogleError } from './google-errors';
import type { GoogleIdentity } from './google-identity';

export type GoogleAccount = { id: string; googleSubject: string | null };
export type GoogleAccountStore = {
  findBySubject: (subject: string) => Promise<GoogleAccount | null>;
  findByEmail: (email: string) => Promise<GoogleAccount | null>;
  findById: (id: string) => Promise<GoogleAccount | null>;
  bind: (id: string, identity: GoogleIdentity) => Promise<void>;
  create: (data: {
    name: string; email: string; passwordHash: string;
    googleSubject: string; googleEmail: string; role: 'READER';
  }) => Promise<GoogleAccount>;
};

/** Call inside one database transaction; the caller serializes Google bindings. */
export async function resolveGoogleAccount(
  store: GoogleAccountStore,
  identity: GoogleIdentity,
  options: { linkUserId?: string; reservedAdminEmail?: string } = {},
): Promise<string> {
  const owner = await store.findBySubject(identity.subject);
  if (options.linkUserId) {
    if (owner && owner.id !== options.linkUserId) throw new GoogleError('already_linked');
    const target = await store.findById(options.linkUserId);
    if (!target) throw new GoogleError('reauth_required');
    if (target.googleSubject && target.googleSubject !== identity.subject) throw new GoogleError('already_linked');
    // Binding adds a login method. It never replaces email, role or ownership.
    await store.bind(target.id, identity);
    return target.id;
  }
  if (owner) return owner.id;
  if (await store.findByEmail(identity.email)) throw new GoogleError('existing_account');
  if (identity.email === options.reservedAdminEmail?.trim().toLowerCase()) {
    throw new GoogleError('admin_link_required');
  }
  const created = await store.create({
    name: identity.name,
    email: identity.email,
    googleSubject: identity.subject,
    googleEmail: identity.email,
    // No password exists for Google-only users; verifyPassword rejects this format.
    passwordHash: `google-only:${randomToken()}`,
    role: 'READER',
  });
  return created.id;
}
