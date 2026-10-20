'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Management = {
  configuration: { configured: boolean; missing: string[] }; subscribers: number; currentIssueId: string | null;
  posts: { id: number; title: string; author: string; excerpt: string; dateLabel: string }[];
  issues: { id: string; title: string; total: number; sent: number; pending: number; skipped: number; errors: string[] }[];
};
export default function NewsletterManager() {
  const [data, setData] = useState<Management | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/newsletter/admin');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '뉴스레터를 불러오지 못했습니다.');
      setData(result);
    } catch (err) { setError(err instanceof Error ? err.message : '요청에 실패했습니다.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function send(issueId?: string) {
    if (!window.confirm(issueId ? '미완료 발송을 재시도할까요? 이미 발송한 이메일은 다시 보내지 않습니다.' : '동의한 회원에게 이번 주 뉴스레터를 발송할까요? 실제 이메일이 전송됩니다.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/newsletter/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, issueId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '메일 서비스 설정을 확인해주세요.');
      setMessage(result.busy ? '다른 발송 작업이 진행 중입니다.' : `${result.sent}건 발송, 미완료 ${result.pending}건. 결과가 불확실한 이메일은 중복 방지를 위해 23시간 이후 자동 재발송하지 않습니다.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : '요청에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <section className="border rounded-xl p-6 my-8">
    <h2 className="text-lg font-semibold mb-2">뉴스레터 발송</h2>
    <p className="text-sm text-gray-600 mb-4">이메일 확인을 마친 수신 동의 회원에게 매주 새 글을 한 번씩 모아 발송합니다. 같은 주의 뉴스레터는 다시 생성하지 않습니다. 기본 자동 작업은 매일 오전 9시경 실행하며, 한 번에 최대 40명씩 배송합니다.</p>
    {data && <>
      <p className="text-sm mb-4">수신 동의 {data.subscribers}명 · 다음 묶음 후보 {data.posts.length}편</p>
      {!data.configuration.configured && <p className="text-sm text-amber-700 mb-4">메일 설정 필요: {data.configuration.missing.join(', ')}</p>}
      {data.currentIssueId && <p className="text-sm mb-4">이번 주 묶음이 이미 만들어졌습니다. 아래 새 글은 다음 주에 포함됩니다.</p>}
      <details className="mb-4"><summary className="cursor-pointer text-sm underline">발송 후보 미리보기</summary><div className="space-y-4 mt-4">{data.posts.length ? data.posts.map((post) => <article key={post.id}><Link href={`/posts/${post.id}`} className="font-semibold underline">{post.title}</Link><p className="text-xs text-gray-500">{post.author} · {post.dateLabel}</p><p className="text-sm mt-1">{post.excerpt}</p></article>) : <p className="text-sm text-gray-500">아직 새 글이 없습니다.</p>}</div></details>
      <button disabled={busy || !data.configuration.configured} onClick={() => send()} className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50">{busy ? '발송 처리 중…' : data.currentIssueId ? '미완료 발송 계속하기' : '이번 주 뉴스레터 지금 발송'}</button>
      <div className="space-y-4 mt-6">{data.issues.map((issue) => <article key={issue.id} className="border-t pt-4"><h3 className="font-medium text-sm">{issue.title}</h3><p className="text-xs text-gray-500 mt-1">전체 {issue.total}명 · 발송 {issue.sent} · 미완료 {issue.pending} · 취소·제외 {issue.skipped}</p>{issue.errors.map((item) => <p key={item} className="text-xs text-amber-700 mt-2">{item}</p>)}{issue.pending > 0 && <button disabled={busy || !data.configuration.configured} onClick={() => send(issue.id)} className="text-sm underline mt-2 disabled:opacity-50">미완료 건 재시도</button>}</article>)}</div>
    </>}
    {!data && !error && <p className="text-sm text-gray-500">뉴스레터를 불러오는 중…</p>}
    {message && <p role="status" className="text-sm mt-4">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-600 mt-4">{error}</p>}
  </section>;
}
