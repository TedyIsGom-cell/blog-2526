import { getCurrentUser, isAdmin } from '@/lib/server-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function CategoryAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/account');
  return children;
}
