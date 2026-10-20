'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
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
    <p className="text-sm text-gray-500 mb-6">내 계정으로 로그인해 글과 소식을 만나보세요.</p>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">이메일<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={254} className="block w-full border rounded px-3 py-2 mt-1" /></label>
      <label className="block text-sm">비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="block w-full border rounded px-3 py-2 mt-1" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">{loading ? '로그인 중…' : '로그인'}</button>
    </form>
    <p className="text-sm text-gray-500 mt-5">처음 방문하셨나요? <Link href="/register" className="underline">회원가입</Link></p>
  </main>;
}
