import { prisma } from '@/lib/db';
import Link from 'next/link';
import CategoryManager from '../../components/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [postCount, commentCount, viewAgg, likeAgg, siteStat] = await Promise.all([
    prisma.post.count(),
    prisma.comment.count(),
    prisma.post.aggregate({ _sum: { viewCount: true } }),
    prisma.post.aggregate({ _sum: { likeCount: true } }),
    prisma.siteStat.findUnique({ where: { id: 1 } }),
  ]);

  const stats = [
    { label: '방문자 수 (홈 방문 기준)', value: siteStat?.homeViews ?? 0 },
    { label: '게시물 수', value: postCount },
    { label: '총 조회수', value: viewAgg._sum.viewCount ?? 0 },
    { label: '총 좋아요', value: likeAgg._sum.likeCount ?? 0 },
    { label: '총 댓글 수', value: commentCount },
  ];

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
        ← 홈으로
      </Link>
      <h1 className="text-2xl font-bold mt-6 mb-8">관리자 대시보드</h1>

      <div className="grid grid-cols-3 gap-3 mb-14">
        {stats.map((s) => (
          <div key={s.label} className="border rounded-lg p-4">
            <p className="text-2xl font-bold">{s.value.toLocaleString('ko-KR')}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">카테고리 관리</h2>
      <CategoryManager />

      <div className="mt-14">
        <Link
          href="/admin/write"
          className="inline-block bg-black text-white rounded px-6 py-2 text-sm"
        >
          새 글 쓰기
        </Link>
      </div>
    </main>
  );
}
