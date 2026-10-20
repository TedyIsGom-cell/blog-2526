import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const MAX_EMAIL_TEXT_LENGTH = 100_000;
export const MAX_WEBHOOK_BYTES = 64 * 1024;
export const MAX_EMAIL_RESPONSE_BYTES = 2 * 1024 * 1024;
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export class InvalidSubmissionError extends Error {}

export type ReceivedSubmissionEmail = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  authentication?: { spf?: string; dkim?: string; dmarc?: string } | null;
};

export function normalizeSubmissionDomain(value: string | undefined): string | null {
  const domain = value?.trim().toLowerCase();
  if (!domain || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) return null;
  return domain;
}

export function parseMailbox(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512 || /[\r\n\x00]/.test(value)) return null;
  const match = value.trim().match(/^(?:[^<>]*<([^<>]+)>|([^<>\s]+))$/);
  const email = (match?.[1] || match?.[2] || '').trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) ? email : null;
}

export function hashSubmissionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newSubmissionCredential(domain: string) {
  const token = randomBytes(24).toString('hex');
  return {
    address: `submit+${token}@${domain}`,
    tokenHash: hashSubmissionToken(token),
    tokenHint: token.slice(-6),
  };
}

/** Multiple private addresses in one message are rejected to avoid ambiguous authorship. */
export function submissionTokenFromRecipients(recipients: unknown, domain: string): string | null {
  if (!Array.isArray(recipients) || recipients.length > 50) return null;
  const tokens = new Set<string>();
  for (const recipient of recipients) {
    const email = parseMailbox(recipient);
    if (!email?.endsWith(`@${domain}`)) continue;
    const localPart = email.slice(0, -domain.length - 1);
    if (localPart.startsWith('submit+') && TOKEN_PATTERN.test(localPart.slice(7))) tokens.add(localPart.slice(7));
  }
  return tokens.size === 1 ? Array.from(tokens)[0] : null;
}

/** These authentication values come from Resend's receiver, never a user-controlled header. */
export function isAuthenticatedSender(email: ReceivedSubmissionEmail): boolean {
  return email.authentication?.dmarc === 'pass' || email.authentication?.dkim === 'pass';
}

export function parseSubmissionEmail(email: ReceivedSubmissionEmail) {
  const title = typeof email.subject === 'string' ? email.subject.trim() : '';
  const content = typeof email.text === 'string' ? email.text.replace(/\r\n?/g, '\n').trim() : '';
  if (!title || title.length > 300 || /[\r\n\x00]/.test(title)) {
    throw new InvalidSubmissionError('메일 제목은 1~300자의 한 줄이어야 합니다.');
  }
  if (!content || content.length > MAX_EMAIL_TEXT_LENGTH || content.includes('\x00')) {
    throw new InvalidSubmissionError('일반 텍스트 본문이 필요합니다. 본문은 100,000자까지 가능합니다.');
  }
  return { title, content, category: '이메일 투고' };
}

/** Svix Standard Webhooks v1: https://docs.svix.com/receiving/verifying-payloads/how-manual */
export function verifyInboundWebhook(payload: string, headers: Headers, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): unknown {
  const messageId = headers.get('svix-id') || '';
  const timestamp = headers.get('svix-timestamp') || '';
  const signatures = headers.get('svix-signature') || '';
  if (!messageId || messageId.length > 256 || !/^\d{1,12}$/.test(timestamp) || !signatures || signatures.length > 4096) {
    throw new Error('Invalid webhook headers');
  }
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) throw new Error('Webhook timestamp outside tolerance');
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret) || secret.length > 1024) throw new Error('Invalid webhook signing secret');
  const key = Buffer.from(secret.slice(6), 'base64');
  if (key.length < 16) throw new Error('Invalid webhook signing secret');
  const expected = createHmac('sha256', key).update(`${messageId}.${timestamp}.${payload}`).digest();
  let valid = false;
  for (const signature of signatures.split(/\s+/)) {
    const match = signature.match(/^v1,([A-Za-z0-9+/]{43}=)$/);
    if (!match) continue;
    const actual = Buffer.from(match[1], 'base64');
    if (actual.length === expected.length) valid = timingSafeEqual(expected, actual) || valid;
  }
  if (!valid) throw new Error('Invalid webhook signature');
  return JSON.parse(payload);
}

export async function readLimitedText(response: Response | Request, maximumBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new InvalidSubmissionError('메일 크기 제한을 초과했습니다.');
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new InvalidSubmissionError('메일 크기 제한을 초과했습니다.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function retrieveReceivedEmail(emailId: string, apiKey: string): Promise<ReceivedSubmissionEmail> {
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Receiving API failed (${response.status})`);
  const email = JSON.parse(await readLimitedText(response, MAX_EMAIL_RESPONSE_BYTES));
  if (!email || email.id !== emailId || !Array.isArray(email.to) || !parseMailbox(email.from)) {
    throw new Error('Unexpected receiving API response');
  }
  return email;
}

export function inboundIsConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET && normalizeSubmissionDomain(process.env.INBOUND_EMAIL_DOMAIN));
}

/** The provider message ID and post are committed together, so retries cannot duplicate a post. */
export async function publishReceivedEmail(email: ReceivedSubmissionEmail, domain: string): Promise<{ status: string; postId?: number }> {
  const { prisma } = await import('./db');
  const { Prisma } = await import('@prisma/client');
  const prior = await prisma.emailSubmission.findUnique({ where: { providerMessageId: email.id } });
  if (prior) return { status: prior.status, ...(prior.postId !== null && { postId: prior.postId }) };

  const sender = parseMailbox(email.from);
  const token = submissionTokenFromRecipients(email.to, domain);
  const tokenHash = token ? hashSubmissionToken(token) : '';
  let parsed: ReturnType<typeof parseSubmissionEmail> | null = null;
  let rejection: string | null = null;
  try { parsed = parseSubmissionEmail(email); } catch (error) {
    rejection = error instanceof InvalidSubmissionError ? error.message : '메일 형식이 올바르지 않습니다.';
  }
  if (!sender || !token || !isAuthenticatedSender(email)) rejection = '발신자 또는 전용 투고 주소 인증에 실패했습니다.';

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the credential before rechecking both its owner and the current role.
      const credential = token ? await tx.emailSubmissionCredential.findUnique({ where: { tokenHash } }) : null;
      if (credential) {
        await tx.$queryRaw`SELECT "id" FROM "EmailSubmissionCredential" WHERE "id" = ${credential.id} FOR UPDATE`;
      }
      const currentCredential = credential ? await tx.emailSubmissionCredential.findUnique({ where: { id: credential.id }, include: { user: true } }) : null;
      if (!currentCredential || currentCredential.tokenHash !== tokenHash || currentCredential.user.email.toLowerCase() !== sender || !['ADMIN', 'WRITER'].includes(currentCredential.user.role)) {
        rejection = '현재 집필자의 이메일과 유효한 전용 투고 주소가 필요합니다.';
      }
      const submission = await tx.emailSubmission.create({
        data: { providerMessageId: email.id, sender: sender || '(invalid)', status: rejection ? 'REJECTED' : 'PROCESSING', error: rejection },
      });
      if (rejection || !parsed || !currentCredential) return { status: 'REJECTED' };
      await tx.category.upsert({ where: { name: parsed.category }, create: { name: parsed.category }, update: {} });
      const post = await tx.post.create({
        data: { ...parsed, slug: `email-${randomUUID()}`, authorId: currentCredential.userId, published: true },
      });
      await tx.emailSubmission.update({ where: { id: submission.id }, data: { status: 'PUBLISHED', postId: post.id } });
      return { status: 'PUBLISHED', postId: post.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.emailSubmission.findUnique({ where: { providerMessageId: email.id } });
      if (existing) return { status: existing.status, ...(existing.postId !== null && { postId: existing.postId }) };
    }
    throw error;
  }
}
