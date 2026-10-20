'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function UnsubscribeForm({ token }: { token?: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function unsubscribe() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/newsletter/unsubscribe?token=${encodeURIComponent(token || '')}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '수신 거부에 실패했습니다.');
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : '요청에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto px-6 py-24">
    <h1 className="text-2xl font-bold mb-4">뉴스레터 수신 거부</h1>
    <p className="text-gray-600 mb-6">{done ? '뉴스레터 수신을 중단했습니다. 내 계정에서 다시 신청할 수 있습니다.' : '아래 버튼을 누르면 이 이메일 주소로 뉴스레터를 보내지 않습니다.'}</p>
    {!done && <button onClick={unsubscribe} disabled={busy || !token} className="bg-black text-white rounded px-5 py-2 disabled:opacity-50">{busy ? '처리 중…' : '수신 거부하기'}</button>}
    {error && <p role="alert" className="text-red-600 mt-4">{error}</p>}
    <Link href="/" className="block mt-8 text-sm underline">블로그로 돌아가기</Link>
  </main>;
}
