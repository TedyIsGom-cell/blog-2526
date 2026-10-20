'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BirthdaySettings({ initialBirthDate }: { initialBirthDate: string | null }) {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState(initialBirthDate || '');
  const [savedBirthDate, setSavedBirthDate] = useState(initialBirthDate || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate: birthDate || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '생일을 저장하지 못했습니다.');
      const saved = typeof result.user?.birthDate === 'string' ? result.user.birthDate.slice(0, 10) : '';
      setBirthDate(saved); setSavedBirthDate(saved);
      setMessage(saved ? '생일을 저장했습니다. 글과 댓글에 작성 당시의 일수가 표시됩니다.' : '생일을 삭제했습니다. 글과 댓글에는 생일 미등록으로 표시됩니다.');
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : '연결을 확인하고 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }

  return <section className="border rounded-lg p-5 space-y-4" aria-labelledby="birthday-heading">
    <h2 id="birthday-heading" className="text-lg font-semibold">생일과 작성 당시 나이</h2>
    <p className="text-sm text-gray-600">글·댓글 작성 당시 태어난 지 며칠째인지 표시합니다. 태어난 날은 1일입니다. 예를 들어 날짜 옆에 (7305 일)로 표시됩니다.</p>
    <p className="text-xs text-gray-500">생일을 변경하면 기존 글과 회원 댓글의 일수도 다시 계산합니다. 생일을 등록하지 않으면 날짜 옆에 (생일 미등록)으로 표시됩니다.</p>
    <form onSubmit={save} className="space-y-3">
      <label htmlFor="account-birthdate" className="block text-sm">생일 (선택)</label>
      <input id="account-birthdate" type="date" autoComplete="bday" max={today} value={birthDate} onChange={e => { setBirthDate(e.target.value); setMessage(''); }} disabled={busy} className="w-full sm:w-auto border rounded px-3 py-2 text-sm disabled:opacity-50" />
      <div className="flex items-center gap-4 text-sm">
        <button type="submit" disabled={busy || birthDate === savedBirthDate} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">{busy ? '저장 중…' : '생일 저장'}</button>
        {(birthDate || savedBirthDate) && <button type="button" disabled={busy} onClick={() => { setBirthDate(''); setMessage('생일을 비웠습니다. 생일 저장을 누르면 삭제됩니다.'); }} className="underline text-gray-500 disabled:opacity-50">생일 비우기</button>}
      </div>
    </form>
    {message && <p role="status" className="text-sm text-gray-600">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
