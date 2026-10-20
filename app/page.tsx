import { Fragment } from 'react';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { isValidSession } from '@/lib/auth';
import { formatDateTime, daysSinceBase } from '@/lib/format';
import LogoutButton from './components/LogoutButton';
import NotificationBell from './components/NotificationBell';
import DarkModeToggle from './components/DarkModeToggle';
import SearchBox from './components/SearchBox';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [posts, popularPosts, categories, categoryCounts] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
    }),
    prisma.post.findMany({
      where: { published: true },
      orderBy: { viewCount: 'desc' },
      take: 3,
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.post.groupBy({
      by: ['category'],
      where: { published: true },
      _count: { category: true },
    }),
  ]);

  // 홈 화면 방문 횟수 집계 (관리자 대시보드에서 사용)
  await prisma.siteStat.upsert({
    where: { id: 1 },
    update: { homeViews: { increment: 1 } },
    create: { id: 1, homeViews: 1 },
  });

  const countMap = new Map(categoryCounts.map((c) => [c.category, c._count.category]));

  const sessionToken = cookies().get('admin_session')?.value;
  const isAdmin = await isValidSession(sessionToken);

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">이산의 블로그</h1>
        <div className="flex items-center gap-4">
          <DarkModeToggle />
          <Link href="/changelog" className="text-sm text-gray-400 hover:text-gray-700">
            업데이트 기록
          </Link>
          {isAdmin ? (
            <>
              <NotificationBell />
              <Link href="/admin/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
                관리자
              </Link>
              <Link href="/admin/write" className="text-sm text-gray-400 hover:text-gray-700">
                글쓰기
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700">
              관리자
            </Link>
          )}
        </div>
      </div>

      <div className="mb-10">
        <SearchBox />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-10">
        <aside>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">카테고리</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="text-gray-700 hover:underline">
                전체 ({posts.length})
              </Link>
            </li>
            {categories
              .filter((cat) => !cat.parentId)
              .map((cat) => (
                <Fragment key={cat.id}>
                  <li>
                    <Link
                      href={`/category/${encodeURIComponent(cat.name)}`}
                      className="text-gray-500 hover:text-gray-800 hover:underline"
                    >
                      {cat.name} ({countMap.get(cat.name) || 0})
                    </Link>
                  </li>
                  {categories
                    .filter((child) => child.parentId === cat.id)
                    .map((child) => (
                      <li key={child.id} className="ml-3">
                        <Link
                          href={`/category/${encodeURIComponent(child.name)}`}
                          className="text-gray-400 hover:text-gray-700 hover:underline"
                        >
                          ↳ {child.name} ({countMap.get(child.name) || 0})
                        </Link>
                      </li>
                    ))}
                </Fragment>
              ))}
          </ul>
        </aside>

        <div>
          {popularPosts.length > 0 && (
            <div className="mb-14">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">인기 게시물</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {popularPosts.map((post, i) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="border rounded-lg p-3 hover:border-gray-400 transition"
                  >
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                    <p className="text-sm font-medium mt-1 line-clamp-2">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-2">조회 {post.viewCount}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="block group">
                <p className="text-xs text-gray-400">{post.category}</p>
                <h2 className="text-xl font-semibold group-hover:underline">
                  {post.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mt-1">
                  <span>{formatDateTime(post.createdAt)}</span>
                  <span className="text-gray-400">({daysSinceBase(post.createdAt)}일)</span>
                  <span>·</span>
                  <span>조회 {post.viewCount}</span>
                  <span>·</span>
                  <span>좋아요 {post.likeCount}</span>
                  <span>·</span>
                  <span>댓글 {post._count.comments}</span>
                </div>
              </Link>
            ))}
            {posts.length === 0 && (
              <p className="text-gray-500">아직 글이 없습니다. 관리자 페이지에서 첫 글을 써보세요.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
