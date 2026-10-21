export class GoogleError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'GoogleError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const publicCodes = new Set([
  'not_configured', 'state', 'cancelled', 'existing_account', 'already_linked',
  'reauth_required', 'admin_link_required',
]);

export function publicGoogleError(error: unknown): string {
  return error instanceof GoogleError && publicCodes.has(error.code) ? error.code : 'failed';
}
