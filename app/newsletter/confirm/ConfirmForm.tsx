'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ConfirmForm({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/newsletter/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '확인에 실패했습니다.');
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : '요청에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto px-6 py-24">
    <h1 className="text-2xl font-bold mb-4">뉴스레터 수신 확인</h1>
    <p className="text-gray-600 mb-6">{done ? '수신 동의가 확인되었습니다. 다음 주간 뉴스레터부터 보내드립니다.' : '이 이메일 주소로 주간 뉴스레터를 받으려면 아래 버튼을 눌러주세요.'}</p>
    {!done && <button disabled={busy || !token} onClick={confirm} className="bg-black text-white px-5 py-2 rounded disabled:opacity-50">{busy ? '확인 중…' : '이메일 확인 및 수신 동의'}</button>}
    {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
    <Link href="/account" className="block mt-8 underline text-sm">내 계정으로 이동</Link>
  </main>;
}
