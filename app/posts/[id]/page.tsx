import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { isValidSession } from '@/lib/auth';
import { formatDateTime, daysSinceBase } from '@/lib/format';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import LogoutButton from '../../components/LogoutButton';
import NotificationBell from '../../components/NotificationBell';
import DarkModeToggle from '../../components/DarkModeToggle';
import PostContent from '../../components/PostContent';
import InstagramExport from '../../components/InstagramExport';

export const dynamic = 'force-dynamic';

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const postId = Number(params.id);
  if (!Number.isInteger(postId)) {
    notFound();
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post || !post.published) {
    notFound();
  }

  // 조회수 1 증가 (페이지를 열 때마다 카운트)
  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  });

  const sessionToken = cookies().get('admin_session')?.value;
  const isAdmin = await isValidSession(sessionToken);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
          ← 목록으로
        </Link>
        <div className="flex items-center gap-4">
          <DarkModeToggle />
          {isAdmin && (
            <>
              <NotificationBell />
              <Link
                href="/admin/dashboard"
                className="text-sm text-gray-400 hover:text-gray-700"
              >
                관리자
              </Link>
              <Link
                href={`/admin/edit/${post.id}`}
                className="text-sm text-gray-400 hover:text-gray-700"
              >
                수정
              </Link>
              <LogoutButton />
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">{post.category}</p>
      <h1 className="text-3xl font-bold mt-1 mb-2">{post.title}</h1>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mb-8">
        <span>{formatDateTime(post.createdAt)}</span>
        <span className="text-gray-400">({daysSinceBase(post.createdAt)}일)</span>
        <span>·</span>
        <span>조회 {updated.viewCount}</span>
      </div>

      <article className="mb-10">
        <PostContent content={post.content} />
      </article>

      <LikeButton postId={post.id} initialCount={post.likeCount} />

      <div className="mt-8">
        <InstagramExport
          title={post.title}
          category={post.category}
          createdAt={post.createdAt.toISOString()}
          content={post.content}
        />
      </div>

      <CommentSection postId={post.id} isAdmin={isAdmin} />
    </main>
  );
}
