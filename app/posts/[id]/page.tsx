import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isAdmin, canWrite, canEditPost } from '@/lib/server-auth';
import { formatDateWithAge, daysOldAt } from '@/lib/format';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import LogoutButton from '../../components/LogoutButton';
import NotificationBell from '../../components/NotificationBell';
import PostContent from '../../components/PostContent';
import InstagramExport from '../../components/InstagramExport';

export const dynamic = 'force-dynamic';

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const postId = Number((await params).id);
  if (!Number.isSafeInteger(postId) || postId < 1 || postId > 2147483647) {
    notFound();
  }

  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: { select: { name: true, birthDate: true } } } });

  if (!post || !post.published) {
    notFound();
  }

  // 조회수 1 증가 (페이지를 열 때마다 카운트)
  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  });

  const user = await getCurrentUser();
  const admin = isAdmin(user);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="site-header flex items-start justify-between flex-wrap gap-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
          ← 목록으로
        </Link>
        <div className="flex items-center flex-wrap gap-4">
          {user ? <>
            {admin && <NotificationBell />}
            <Link href="/account" className="text-sm text-gray-500 hover:underline">내 정보</Link>
            {canWrite(user) && <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:underline">{admin ? '관리' : '내 글'}</Link>}
            {canEditPost(user, post.authorId) && <Link href={`/admin/edit/${post.id}`} className="text-sm text-gray-500 hover:underline">수정</Link>}
            <LogoutButton />
          </> : <Link href="/login" className="text-sm text-gray-500 hover:underline">로그인</Link>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">{post.category}</p>
      <h1 className="text-3xl font-bold mt-1 mb-2">{post.title}</h1>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mb-8">
        <span>{post.author?.name || '기존 글'}</span>
        <span>·</span>
        <span>{formatDateWithAge(post.createdAt, post.author?.birthDate)}</span>
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
          authorName={post.author?.name || '기존 글'}
          ageDays={daysOldAt(post.author?.birthDate, post.createdAt)}
        />
      </div>

      <CommentSection postId={post.id} isAdmin={admin} viewer={user ? { name: user.name } : null} />
    </main>
  );
}
