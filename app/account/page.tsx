import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { canWrite, getCurrentUser } from '@/lib/server-auth';
import LogoutButton from '@/app/components/LogoutButton';
import NewsletterPreferences from '@/app/components/NewsletterPreferences';
import EmailSubmissionSettings from '@/app/components/EmailSubmissionSettings';
import BirthdaySettings from '@/app/components/BirthdaySettings';
import ThemeSettings from '@/app/components/ThemeSettings';

export const dynamic = 'force-dynamic';
const roleLabels: Record<UserRole, string> = { READER: '독자', WRITER: '집필자', ADMIN: '관리자' };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <main className="max-w-4xl mx-auto px-6 py-16">
    <nav className="flex justify-between items-center gap-4"><Link href="/" className="text-sm text-gray-500 hover:underline">← 블로그로</Link><LogoutButton /></nav>
    <h1 className="text-2xl font-bold mt-6 mb-6">내 정보</h1>
    <section className="border rounded-lg p-5 mb-8">
      <p className="font-semibold">{user.name} <span className="text-xs font-normal border rounded-full px-2 py-1 ml-2">{roleLabels[user.role]}</span></p>
      <p className="text-sm text-gray-500 mt-2 break-all">{user.email}</p>
      {canWrite(user) ? <div className="flex flex-wrap gap-4 mt-5 text-sm"><Link href="/admin/write" className="bg-black text-white rounded px-4 py-2">새 글 쓰기</Link><Link href="/admin/dashboard" className="border rounded px-4 py-2">{user.role === 'ADMIN' ? '관리 대시보드' : '내 글 관리'}</Link></div> : <p className="text-sm text-gray-500 mt-4">함께 글을 쓰려면 관리자에게 집필자 권한을 요청해주세요.</p>}
    </section>
    <div className="account-theme-settings border rounded-lg p-5 mb-8">
      <ThemeSettings />
    </div>
    <BirthdaySettings initialBirthDate={user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null} />
    <NewsletterPreferences />
    {canWrite(user) && <div className="mt-8"><EmailSubmissionSettings /></div>}
  </main>;
}
