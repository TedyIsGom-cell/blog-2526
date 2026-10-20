'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'READER' | 'WRITER' | 'ADMIN';
type Member = { id: string; name: string; email: string; role: Role };
const labels: Record<Role, string> = { READER: '독자', WRITER: '집필자', ADMIN: '관리자' };

export default function MemberManager() {
  const router = useRouter();
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '회원 목록을 불러올 수 없습니다.');
      setUsers(data.users);
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인해주세요.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function changeRole(user: Member, role: Role) {
    if (role === user.role) return;
    if (!window.confirm(`${user.name} 님을 ${labels[role]}로 변경할까요?${role === 'ADMIN' ? ' 관리자는 모든 글과 회원 권한을 관리할 수 있습니다.' : ''}`)) return;
    setSaving(user.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '권한 변경에 실패했습니다.');
      setUsers(current => current.map(member => member.id === user.id ? { ...member, role } : member));
      setMessage(`${user.name} 님의 권한을 변경했습니다.`);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인해주세요.'); }
    finally { setSaving(null); }
  }

  return <section className="border rounded-lg p-5">
    <h2 className="text-lg font-semibold">회원과 직책</h2>
    <p className="text-sm text-gray-500 mt-2 mb-4">독자는 글을 읽고 뉴스레터를 구독합니다. 집필자는 본인 글을 작성·수정하며, 관리자는 모든 글을 수정·삭제하고 직책을 관리합니다.</p>
    {loading ? <p className="text-sm text-gray-500">회원 목록을 불러오는 중…</p> : <ul className="divide-y">{users.map(user => <li key={user.id} className="py-3 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-gray-500 break-all">{user.email}</p></div><label className="text-sm"><span className="sr-only">{user.name} 님의 직책</span><select value={user.role} disabled={saving !== null} onChange={event => void changeRole(user, event.target.value as Role)} className="border rounded px-2 py-1 disabled:opacity-50"><option value="READER">독자</option><option value="WRITER">집필자</option><option value="ADMIN">관리자</option></select></label></li>)}</ul>}
    {error && <p role="alert" className="text-sm text-red-600 mt-3">{error} <button onClick={() => void load()} className="underline">다시 불러오기</button></p>}
    {message && <p role="status" className="text-sm text-green-700 mt-3">{message}</p>}
  </section>;
}
