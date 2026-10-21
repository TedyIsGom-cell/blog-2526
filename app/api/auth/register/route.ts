import { NextResponse } from 'next/server';
import { checkSameOrigin } from '@/lib/server-auth';

// Existing password accounts keep their login route; new accounts use Google.
export async function POST(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ error: '새 회원가입은 Google로 진행합니다. 로그인 화면에서 Google로 계속하기를 선택해 주세요.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
