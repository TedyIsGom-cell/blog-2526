'use client';

import { useCallback, useEffect, useState } from 'react';

type Preferences = { enabled: boolean; pending: boolean; email: string; configured: boolean };
export default function NewsletterPreferences() {
  const [data, setData] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/newsletter/subscription');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '수신 설정을 불러오지 못했습니다.');
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : '요청에 실패했습니다.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function update(enabled: boolean) {
    if (!data) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/newsletter/subscription', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '저장에 실패했습니다.');
      setData({ ...data, ...result });
      setMessage(enabled ? '확인 메일을 보냈습니다. 이메일 안의 링크에서 수신 동의를 완료해주세요.' : '뉴스레터 수신을 중단했습니다.');
    } catch (err) { setError(err instanceof Error ? err.message : '요청에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <section className="border rounded-xl p-6 mt-8">
    <h2 className="text-lg font-semibold mb-2">주간 뉴스레터</h2>
    <p className="text-sm text-gray-600 mb-3">여러 집필자의 새 글을 매주 월요일 오전 9시경부터 모아 보내드립니다. 인원이 많으면 나누어 배송합니다. 이메일 주소 확인 후 배송을 시작하며, 언제든 수신을 중단할 수 있습니다.</p>
    {data ? <>
      <p className="text-sm mb-3">받는 주소: {data.email}</p>
      {!data.configured && <p className="text-sm text-amber-700 mb-3">관리자가 메일 서비스를 연결하면 수신을 신청할 수 있습니다.</p>}
      {data.pending && <p className="text-sm mb-3">이메일 확인 대기 중입니다. 받은편지함의 확인 링크를 눌러주세요.</p>}
      {data.enabled ? <><p className="text-sm mb-3">이메일 확인 완료 · 수신 중</p><button onClick={() => update(false)} disabled={busy} className="text-sm underline disabled:opacity-50">수신 중단</button></> : <div className="flex flex-wrap gap-4 text-sm"><button onClick={() => update(true)} disabled={busy || !data.configured} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">{busy ? '처리 중…' : data.pending ? '확인 메일 다시 보내기' : '뉴스레터 수신 신청'}</button>{data.pending && <button onClick={() => update(false)} disabled={busy} className="underline disabled:opacity-50">신청 취소</button>}</div>}
      <button onClick={() => { setError(''); void load(); }} className="block text-xs underline text-gray-500 mt-3">이메일 확인 상태 새로고침</button>
    </> : !error && <p className="text-sm text-gray-500">설정을 불러오는 중…</p>}
    {message && <p role="status" className="text-sm mt-3">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
  </section>;
}
