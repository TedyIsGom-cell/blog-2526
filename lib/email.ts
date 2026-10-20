import { timingSafeEqual } from 'node:crypto';

export type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
};

export function emailConfiguration() {
  const missing = ['RESEND_API_KEY', 'EMAIL_FROM', 'SITE_URL', 'CRON_SECRET'].filter((name) => !process.env[name]);
  let siteUrl = '';
  try {
    const url = new URL(process.env.SITE_URL || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('invalid origin');
    }
    siteUrl = url.origin;
  } catch {
    if (!missing.includes('SITE_URL')) missing.push('SITE_URL (공개 HTTPS 기본 주소)');
  }
  return { configured: missing.length === 0, missing, siteUrl };
}

export function secretMatches(actual: string | null, expected: string | undefined) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return (!origin || origin === new URL(req.url).origin) && req.headers.get('sec-fetch-site') !== 'cross-site';
}

export async function sendEmail(payload: EmailPayload, idempotencyKey: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) throw new Error('메일 서비스가 설정되지 않았습니다.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as { id?: string };
  if (!response.ok || !data.id) {
    // Do not persist the response body; it can contain addresses or credentials.
    throw new Error(`메일 제공자 응답 오류 (${response.status})`);
  }
  return data.id;
}
