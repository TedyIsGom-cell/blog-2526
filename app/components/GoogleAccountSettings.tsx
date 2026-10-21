'use client';

import { FormEvent, useEffect, useState } from 'react';
import { readAuthResponse } from '@/lib/auth-response';

const linkingErrors: Record<string, string> = {
  not_configured: 'Google 계정 연결을 준비하고 있습니다. 기존 로그인은 계속 사용할 수 있습니다.',
  state: '연결 요청이 만료되었거나 다른 창에서 시작되었습니다. 다시 연결해 주세요.',
  cancelled: 'Google 계정 연결을 취소했습니다.',
  failed: 'Google 계정을 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  existing_account: '선택한 Google 계정으로 가입한 회원이 있습니다. 다른 Google 계정을 선택해 주세요.',
  already_linked: '선택한 Google 계정은 다른 회원에게 연결되어 있습니다. 다른 Google 계정을 선택해 주세요.',
  reauth_required: '로그인 상태가 바뀌었습니다. 기존 계정으로 다시 로그인한 뒤 연결해 주세요.',
  admin_link_required: '기존 운영자 계정으로 로그인한 뒤 연결해 주세요.',
};

export default function GoogleAccountSettings({ linked, googleEmail, configured }: {
  linked: boolean;
  googleEmail: string | null;
  configured: boolean;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('google_error');
    if (code && Object.prototype.hasOwnProperty.call(linkingErrors, code)) setError(linkingErrors[code]);
    if (linked && query.get('google_linked') === '1') setNotice('Google 계정이 연결되었습니다. 다음부터 Google로 로그인할 수 있습니다.');
  }, [linked]);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const status = await readAuthResponse(response.clone(), 'Google 계정을 연결하지 못했습니다.');
      if (!response.ok) throw new Error(status.error || 'Google 계정을 연결하지 못했습니다.');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('url' in data) || typeof data.url !== 'string') throw new Error('연결을 시작하지 못했습니다. 다시 시도해 주세요.');
      const destination = new URL(data.url);
      if (destination.origin !== 'https://accounts.google.com' || destination.pathname !== '/o/oauth2/v2/auth') throw new Error('연결을 시작하지 못했습니다. 다시 시도해 주세요.');
      setPassword('');
      window.location.assign(destination.toString());
    } catch (error) {
      setError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return <section aria-labelledby="google-account-heading" className="border rounded-lg p-5 mb-8">
    <h2 id="google-account-heading" className="text-lg font-semibold mb-3">Google 로그인</h2>
    {linked ? <>
      <p className="text-sm">Google 계정이 연결되어 있습니다.</p>
      {googleEmail && <p className="text-sm text-gray-500 mt-2 break-all">연결된 계정: {googleEmail}</p>}
      <p className="text-xs text-gray-500 mt-3 leading-relaxed">다음부터 로그인 화면에서 Google로 계속하기를 선택하세요. 기존 블로그 이메일과 작성 글·권한·뉴스레터 설정은 그대로 유지됩니다.</p>
    </> : <>
      <p className="text-sm text-gray-600 leading-relaxed">지금 계정에 Google 로그인을 연결합니다. Google 이메일이 블로그 이메일과 달라도 괜찮습니다. 기존 이메일과 작성 글·권한·뉴스레터 설정은 그대로 유지됩니다.</p>
      {configured ? <form onSubmit={connect} className="mt-4 space-y-3">
        <label className="block text-sm">현재 계정 비밀번호
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={256} autoComplete="current-password" className="block w-full border rounded px-3 py-2 mt-1" disabled={loading} />
        </label>
        <p className="text-xs text-gray-500 leading-relaxed">본인 확인 후 연결할 Google 계정을 선택합니다.</p>
        <button type="submit" disabled={loading} className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50">{loading ? '연결 준비 중…' : 'Google 계정 연결'}</button>
      </form> : <p className="text-sm text-gray-500 mt-4">Google 계정 연결을 준비하고 있습니다. 기존 로그인은 계속 사용할 수 있습니다.</p>}
    </>}
    {notice && <p role="status" className="text-sm text-green-700 mt-4 leading-relaxed">{notice}</p>}
    {error && <p role="alert" className="text-sm text-red-600 mt-4 leading-relaxed">{error}</p>}
  </section>;
}
