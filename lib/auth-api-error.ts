import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

export function authApiError(error: unknown, operation: string) {
  const reference = randomUUID().slice(0, 8);
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'UNKNOWN';
  const meta = error && typeof error === 'object' && 'meta' in error ? error.meta : null;
  const databaseCode = meta && typeof meta === 'object' && 'code' in meta && typeof meta.code === 'string' ? meta.code : undefined;
  // Never log passwords, tokens, submitted profiles or database connection strings.
  console.error('Authentication API failed', { operation, reference, code, databaseCode, name: error instanceof Error ? error.name : 'UnknownError' });
  const message = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'].includes(code)
    ? '데이터베이스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
    : ['P2021', 'P2022'].includes(code)
      ? '사이트 데이터베이스 설정이 완료되지 않았습니다. 운영자에게 알려주세요.'
      : '계정 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  return NextResponse.json({ error: `${message} (오류 번호: ${reference})` }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}
