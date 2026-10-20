import { prisma } from '@/lib/db';
import Link from 'next/link';
import { formatDateTime, daysSinceBase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
}: {
  params: { name: string };
}) {
  const category = decodeURIComponent(params.name);

  const posts = await prisma.post.findMany({
    where: { published: true, category },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { comments: true } } },
  });

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
        ← 홈으로
      </Link>
      <div className="flex items-center justify-between mt-6 mb-8">
        <h1 className="text-2xl font-bold">카테고리: {category}</h1>
        {posts.length > 0 && (
          <a
            href={`/api/category/${encodeURIComponent(category)}/download`}
            className="text-sm border rounded-full px-4 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            전체 텍스트로 다운로드
          </a>
        )}
      </div>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className="block group">
            <h2 className="text-xl font-semibold group-hover:underline">
              {post.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatDateTime(post.createdAt)}{' '}
              <span className="text-gray-400">({daysSinceBase(post.createdAt)}일)</span>
              {' · '}댓글 {post._count.comments}
            </p>
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-gray-500">이 카테고리에는 아직 글이 없습니다.</p>
        )}
      </div>
    </main>
  );
}
