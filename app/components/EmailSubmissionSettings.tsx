'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Submission = { id: string; status: string; error: string | null; postId: number | null; createdAt: string };
type Settings = { configured: boolean; senderEmail: string; credential: { tokenHint: string; updatedAt: string } | null; submissions: Submission[] };

export default function EmailSubmissionSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/account/email-submission', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '설정을 불러오지 못했습니다.');
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 불러오지 못했습니다.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function change(method: 'POST' | 'DELETE') {
    if (settings?.credential && !window.confirm(method === 'POST' ? '새 주소를 만들면 이전 주소로 투고할 수 없습니다. 새로 만들까요?' : '전용 투고 주소를 폐기할까요? 이전 주소로는 글이 올라가지 않습니다.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/account/email-submission', { method });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '설정을 변경하지 못했습니다.');
      setAddress(method === 'POST' ? data.address : '');
      if (method === 'DELETE') setNotice('투고 주소를 폐기했습니다.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : '설정을 변경하지 못했습니다.'); }
    finally { setBusy(false); }
  }

  async function copyAddress() {
    try { await navigator.clipboard.writeText(address); setNotice('주소를 복사했습니다.'); }
    catch { setError('주소를 선택해 직접 복사해주세요.'); }
  }

  return (
    <section className="border rounded-lg p-5 space-y-4" aria-labelledby="email-submission-heading">
      <h2 id="email-submission-heading" className="text-lg font-semibold">이메일로 글 올리기</h2>
      {loading && <p className="text-sm text-gray-500">투고 설정을 불러오는 중입니다.</p>}
      {settings && <>
        <p className="text-sm leading-relaxed">등록한 이메일 <strong>{settings.senderEmail}</strong>에서 전용 주소로 보내면 제목과 본문이 바로 발행됩니다. 본문은 일반 텍스트 또는 마크다운으로 작성해주세요. 첨부파일과 HTML 서식은 가져오지 않습니다.</p>
        {!settings.configured && <p className="text-sm rounded bg-amber-50 text-amber-900 p-3">아직 이메일 수신 연결이 설정되지 않았습니다. 운영자가 설정을 완료하면 전용 주소를 만들 수 있습니다.</p>}
        {settings.credential && !address && <p className="text-sm text-gray-500">활성 주소가 있습니다 (식별 끝자리: {settings.credential.tokenHint}). 전체 주소는 생성 직후 한 번만 표시합니다. 저장한 주소를 잃어버렸다면 새로 만들어주세요.</p>}
        {address && <div className="rounded border p-3 space-y-2">
          <label htmlFor="email-submission-address" className="block text-sm font-medium">전용 투고 주소 — 지금 복사해 보관해주세요</label>
          <input id="email-submission-address" type="text" readOnly value={address} onFocus={(e) => e.currentTarget.select()} className="w-full rounded border bg-transparent p-2 text-sm font-mono" />
          <button type="button" onClick={copyAddress} className="text-sm underline">주소 복사</button>
          <p className="text-xs text-gray-500">이 주소를 공유하거나 글에 공개하지 마세요. 유출되면 주소를 폐기하거나 새로 만드세요.</p>
        </div>}
        <div className="flex gap-4 flex-wrap">
          <button type="button" disabled={busy || !settings.configured} onClick={() => change('POST')} className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-40">{busy ? '처리 중…' : settings.credential ? '주소 새로 만들기' : '전용 주소 만들기'}</button>
          {settings.credential && <button type="button" disabled={busy} onClick={() => change('DELETE')} className="text-red-600 text-sm underline disabled:opacity-40">주소 폐기</button>}
        </div>
        <p className="text-xs text-gray-500">발신 이메일 인증을 통과한 메일만 처리합니다. 정상 메일이 올라오지 않으면 웹 글쓰기 화면을 이용해주세요. 회신·전달 메일도 본문 전체가 발행되므로 개인 대화나 서명이 포함되어 있지 않은지 확인해주세요.</p>
        {settings.submissions.length > 0 && <div>
          <h3 className="text-sm font-medium mb-2">최근 투고 처리 결과</h3>
          <ul className="space-y-2 text-sm">
            {settings.submissions.map((submission) => <li key={submission.id} className="border-t pt-2">
              <span className="text-gray-500">{new Date(submission.createdAt).toLocaleString('ko-KR')}</span>{' · '}
              {submission.status === 'PUBLISHED' && submission.postId ? <Link href={`/posts/${submission.postId}`} className="underline">발행된 글 보기</Link> : <span>{submission.status === 'REJECTED' ? '발행 안 됨' : '처리 중'}</span>}
              {submission.error && <p className="text-xs text-red-600 mt-1">{submission.error}</p>}
            </li>)}
          </ul>
          <button type="button" onClick={() => { setError(''); void load(); }} className="mt-3 text-xs underline">처리 결과 새로고침</button>
        </div>}
      </>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
