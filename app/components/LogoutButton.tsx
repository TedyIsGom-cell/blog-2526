'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('로그아웃에 실패했습니다. 다시 시도해주세요.');
      router.push('/');
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인해주세요.'); }
    finally { setLoading(false); }
  }
  return <span><button onClick={logout} disabled={loading} className="text-sm text-gray-500 hover:underline disabled:opacity-50">{loading ? '로그아웃 중…' : '로그아웃'}</button>{error && <span role="alert" className="block text-xs text-red-600">{error}</span>}</span>;
}
