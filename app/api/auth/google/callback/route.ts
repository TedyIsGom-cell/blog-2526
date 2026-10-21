import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { googleConfig, exchangeGoogleCode } from '@/lib/google-oidc';
import { consumeGoogleFlow, clearFlowCookie } from '@/lib/google-flow';
import { GoogleError, publicGoogleError } from '@/lib/google-errors';
import { resolveGoogleAccount } from '@/lib/google-accounts';
import { createUserSession, getCurrentUser } from '@/lib/server-auth';
import { getSessionTokenFromRequest, safeEqual, sessionTokenHash } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const config = googleConfig();
  const origin = config?.origin || new URL(req.url).origin;
  let destination = '/login';
  try {
    if (!config) throw new GoogleError('not_configured');
    const params = new URL(req.url).searchParams;
    const flow = await consumeGoogleFlow(req, params.get('state'));
    destination = flow.mode === 'link' ? '/account' : '/login';
    if (params.get('error')) throw new GoogleError('cancelled');
    const code = params.get('code');
    if (!code) throw new GoogleError('failed');
    let linkUserId: string | undefined;
    if (flow.mode === 'link') {
      const token = getSessionTokenFromRequest(req);
      const user = await getCurrentUser(req);
      if (!token || !user || !flow.userId || user.id !== flow.userId || !flow.sessionHash || !safeEqual(flow.sessionHash, sessionTokenHash(token))) {
        throw new GoogleError('reauth_required');
      }
      linkUserId = user.id;
    }
    const identity = await exchangeGoogleCode(config, { code, codeVerifier: flow.codeVerifier, nonce: flow.nonce });
    const userId = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(842107)::text AS locked`;
      if (linkUserId) {
        // The session may have been revoked while Google exchanged the code.
        const session = await tx.session.findUnique({ where: { tokenHash: flow.sessionHash! }, select: { userId: true, expiresAt: true } });
        if (!session || session.userId !== linkUserId || session.expiresAt <= new Date()) throw new GoogleError('reauth_required');
      }
      const select = { id: true, googleSubject: true } as const;
      return resolveGoogleAccount({
        findBySubject: subject => tx.user.findUnique({ where: { googleSubject: subject }, select }),
        findByEmail: email => tx.user.findUnique({ where: { email }, select }),
        findById: id => tx.user.findUnique({ where: { id }, select }),
        bind: async (id, account) => { await tx.user.update({ where: { id }, data: { googleSubject: account.subject, googleEmail: account.email } }); },
        create: data => tx.user.create({ data, select }),
      }, identity, { linkUserId, reservedAdminEmail: process.env.ADMIN_EMAIL });
    });
    const res = NextResponse.redirect(new URL(linkUserId ? '/account?google_linked=1' : '/account', origin));
    // Refresh the existing browser session after successful authentication/linking.
    const oldToken = getSessionTokenFromRequest(req);
    await createUserSession(userId, res);
    if (oldToken) await prisma.session.deleteMany({ where: { tokenHash: sessionTokenHash(oldToken) } });
    clearFlowCookie(res, config);
    return res;
  } catch (error) {
    const res = NextResponse.redirect(new URL(`${destination}?google_error=${publicGoogleError(error)}`, origin));
    clearFlowCookie(res, config);
    return res;
  }
}
