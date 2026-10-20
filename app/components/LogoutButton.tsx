'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/login', { method: 'DELETE' });
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-400 hover:text-gray-700"
    >
      로그아웃
    </button>
  );
}
