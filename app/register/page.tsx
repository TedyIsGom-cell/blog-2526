'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, ...(birthDate ? { birthDate } : {}), ...(setupToken ? { setupToken } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '회원가입에 실패했습니다.');
      router.push('/account');
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해주세요.'); }
    finally { setLoading(false); }
  }

  return <main className="max-w-sm mx-auto px-6 py-20">
    <Link href="/" className="text-sm text-gray-500 hover:underline">← 블로그로</Link>
    <h1 className="text-2xl font-bold mt-6 mb-2">회원가입</h1>
    <p className="text-sm text-gray-500 mb-6">독자로 가입합니다. 집필 권한은 관리자가 부여합니다.</p>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">이름<input value={name} onChange={e => setName(e.target.value)} required minLength={1} maxLength={80} autoComplete="name" className="block w-full border rounded px-3 py-2 mt-1" /></label>
      <label className="block text-sm">이메일<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" className="block w-full border rounded px-3 py-2 mt-1" /></label>
      <label className="block text-sm">생일 <span className="text-gray-500">(선택)</span><input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={today} autoComplete="bday" className="block w-full border rounded px-3 py-2 mt-1" /><span className="block text-xs text-gray-500 mt-1">글·댓글 작성 당시 태어난 지 며칠째인지 표시합니다. 태어난 날은 1일입니다. 생일은 가입 후에도 등록·변경할 수 있습니다.</span></label>
      <label className="block text-sm">비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} maxLength={256} autoComplete="new-password" className="block w-full border rounded px-3 py-2 mt-1" /><span className="text-xs text-gray-500">12~256자로 입력해주세요.</span></label>
      <label className="block text-sm">비밀번호 확인<input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={12} maxLength={256} autoComplete="new-password" className="block w-full border rounded px-3 py-2 mt-1" /></label>
      <details className="text-sm text-gray-500"><summary className="cursor-pointer">사이트 최초 관리자 설정</summary><p className="text-xs mt-2">사이트 운영자만 사용합니다. 사전에 설정한 관리자 이메일과 초기 설정 키가 필요합니다.</p><label className="block mt-2">초기 설정 키<input type="password" autoComplete="off" value={setupToken} onChange={e => setSetupToken(e.target.value)} className="block w-full border rounded px-3 py-2 mt-1" /></label></details>
      <p className="text-xs text-gray-500">뉴스레터 수신 여부는 가입 후 내 계정에서 직접 선택할 수 있습니다.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">{loading ? '가입 중…' : '가입하기'}</button>
    </form>
    <p className="text-sm text-gray-500 mt-5">이미 계정이 있나요? <Link href="/login" className="underline">로그인</Link></p>
  </main>;
}
