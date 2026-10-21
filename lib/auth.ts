// Edge Runtime(미들웨어)에서도 동작해야 해서 Node.js의 'crypto' 모듈 대신
// 표준 Web Crypto API(crypto.subtle)를 사용합니다.

const SECRET = process.env.ADMIN_SECRET || 'please-change-this-secret';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(signature);
}

export async function createSessionToken(): Promise<string> {
  return hmacSha256('admin-session');
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await createSessionToken();
  return token === expected;
}

// 게스트 댓글 비밀번호는 원문을 저장하지 않고 해시로 저장합니다.
export async function hashCommentPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return toHex(digest);
}

export function getSessionTokenFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/admin_session=([^;]+)/);
  return match ? match[1] : undefined;
}
