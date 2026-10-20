import { prisma } from '@/lib/db';
import { canWrite, getCurrentUser, isAdmin } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CategoryManager from '@/app/components/CategoryManager';
import MemberManager from '@/app/components/MemberManager';
import NewsletterManager from '@/app/components/NewsletterManager';
import { formatDateWithAge } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!canWrite(user)) redirect('/account');
  const admin = isAdmin(user);
  const posts = await prisma.post.findMany({
    where: admin ? {} : { authorId: user.id },
    include: { author: { select: { name: true, birthDate: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const stats = admin ? await Promise.all([
    prisma.comment.count(),
    prisma.post.aggregate({ _sum: { viewCount: true, likeCount: true } }),
    prisma.siteStat.findUnique({ where: { id: 1 } }),
  ]) : null;
  const metrics = stats ? [
    { label: '홈 방문', value: stats[2]?.homeViews ?? 0 },
    { label: '게시물', value: posts.length },
    { label: '총 조회수', value: stats[1]._sum.viewCount ?? 0 },
    { label: '총 좋아요', value: stats[1]._sum.likeCount ?? 0 },
    { label: '댓글', value: stats[0] },
  ] : [];

  return <main className="max-w-3xl mx-auto px-6 py-16">
    <nav className="flex gap-5 text-sm text-gray-500"><Link href="/" className="hover:underline">← 블로그로</Link><Link href="/account" className="hover:underline">내 계정 · 뉴스레터</Link></nav>
    <div className="flex items-center justify-between flex-wrap gap-4 mt-6 mb-8"><h1 className="text-2xl font-bold">{admin ? '관리 대시보드' : '내 글 관리'}</h1><Link href="/admin/write" className="bg-black text-white rounded px-5 py-2 text-sm">새 글 쓰기</Link></div>
    {admin && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">{metrics.map(metric => <div key={metric.label} className="border rounded-lg p-4"><p className="text-2xl font-bold">{metric.value.toLocaleString('ko-KR')}</p><p className="text-xs text-gray-500 mt-1">{metric.label}</p></div>)}</div>}
    <section className="mb-10"><h2 className="text-lg font-semibold mb-4">{admin ? '전체 글' : '내가 쓴 글'}</h2>
      <p className="text-sm text-gray-500 mb-3">{admin ? '기존 글을 포함한 모든 글을 수정·삭제할 수 있습니다.' : '내 글을 작성·수정할 수 있습니다. 삭제는 관리자에게 요청해주세요.'}</p>
      {posts.length ? <ul className="divide-y">{posts.map(post => <li key={post.id} className="py-4 flex justify-between items-center gap-4"><div className="min-w-0"><Link href={post.published ? `/posts/${post.id}` : `/admin/edit/${post.id}`} className="font-medium hover:underline break-words">{post.title}</Link><p className="text-xs text-gray-500 mt-1">{post.author?.name || '기존 글'} · {post.category} · {formatDateWithAge(post.createdAt, post.author?.birthDate)}{!post.published && ' · 비공개'}</p></div><Link href={`/admin/edit/${post.id}`} className="shrink-0 text-sm border rounded px-3 py-1">수정{admin ? ' · 삭제' : ''}</Link></li>)}</ul> : <p className="text-sm text-gray-500 py-6">아직 작성한 글이 없습니다.</p>}
    </section>
    {admin && <div className="space-y-10"><MemberManager /><NewsletterManager /><section><h2 className="text-lg font-semibold mb-4">카테고리 관리</h2><CategoryManager /></section></div>}
  </main>;
}
