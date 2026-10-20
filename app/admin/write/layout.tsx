import { getCurrentUser, canWrite } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function WriteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!canWrite(user)) redirect('/account');
  return children;
}
