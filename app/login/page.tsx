'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { readAuthResponse } from '@/lib/auth-response';
import { useRouter } from 'next/navigation';

const googleErrors: Record<string, string> = {
  not_configured: 'Google 로그인을 준비하고 있습니다. 기존 회원은 아래에서 이메일과 비밀번호로 로그인해 주세요.',
  state: '로그인 요청이 만료되었거나 다른 창에서 시작되었습니다. 다시 시도해 주세요.',
  cancelled: 'Google 로그인을 취소했습니다. 원할 때 다시 시도해 주세요.',
  failed: 'Google 로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  existing_account: '이 이메일로 가입한 기존 계정이 있습니다. 아래에서 기존 이메일·비밀번호로 로그인한 뒤 내 정보에서 Google 계정을 연결해 주세요.',
  already_linked: '이 Google 계정은 다른 회원 계정에 연결되어 있습니다. 연결된 계정으로 로그인해 주세요.',
  reauth_required: '기존 이메일·비밀번호로 다시 로그인한 뒤 내 정보에서 Google 계정을 연결해 주세요.',
  admin_link_required: '운영자 계정은 먼저 기존 이메일·비밀번호로 로그인한 뒤 내 정보에서 Google 계정을 연결해 주세요.',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legacyOpen, setLegacyOpen] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('google_error');
    if (!code || !Object.prototype.hasOwnProperty.call(googleErrors, code)) return;
    setError(googleErrors[code]);
    if (['not_configured', 'existing_account', 'reauth_required', 'admin_link_required'].includes(code)) setLegacyOpen(true);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readAuthResponse(response, '로그인에 실패했습니다.');
      if (!response.ok) throw new Error(data.error || '로그인에 실패했습니다.');
      router.push('/account');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해주세요.');
    } finally { setLoading(false); }
  }

  return <main className="max-w-sm mx-auto px-6 py-20">
    <Link href="/" className="text-sm text-gray-500 hover:underline">← 블로그로</Link>
    <h1 className="text-2xl font-bold mt-6 mb-2">로그인</h1>
    <p className="text-sm text-gray-500 mb-6">Google 계정으로 간편하게 로그인하세요. 처음 방문하면 독자로 가입됩니다.</p>
    <a href="/api/auth/google" aria-disabled={loading} onClick={event => { if (loading) event.preventDefault(); }} className="flex min-h-12 items-center justify-center gap-3 border rounded px-4 py-3 font-medium hover:bg-gray-50">
      <span aria-hidden="true" className="font-bold text-lg">G</span>
      Google로 계속하기
    </a>
    <p className="text-xs text-gray-500 mt-3 leading-relaxed">집필 권한은 관리자가 부여합니다. 생일과 뉴스레터 수신 여부는 가입 후 내 정보에서 설정할 수 있습니다.</p>
    {error && <p role="alert" className="text-sm text-red-600 mt-5 leading-relaxed">{error}</p>}
    <details open={legacyOpen} onToggle={event => setLegacyOpen(event.currentTarget.open)} className="border-t mt-8 pt-5">
      <summary className="text-sm cursor-pointer font-medium">기존 계정으로 로그인</summary>
      <p className="text-xs text-gray-500 mt-3 mb-4 leading-relaxed">이미 가입한 회원과 운영자는 기존 이메일·비밀번호로 로그인한 뒤 Google 계정을 연결할 수 있습니다.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">이메일<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={254} className="block w-full border rounded px-3 py-2 mt-1" /></label>
        <label className="block text-sm">비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" maxLength={256} className="block w-full border rounded px-3 py-2 mt-1" /></label>
        <button disabled={loading} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">{loading ? '로그인 중…' : '기존 계정으로 로그인'}</button>
      </form>
    </details>
  </main>;
}
