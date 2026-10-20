'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24">
      <h1 className="text-2xl font-bold mb-6">관리자 로그인</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full border rounded px-3 py-2"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </main>
  );
}
