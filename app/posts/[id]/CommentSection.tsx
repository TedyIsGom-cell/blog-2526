'use client';

import { useState, useEffect, FormEvent } from 'react';
import { formatDateTime } from '@/lib/format';

type Comment = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  parentId: number | null;
};

function getLikedSet(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  return new Set(JSON.parse(localStorage.getItem('likedComments') || '[]'));
}

function saveLikedSet(set: Set<number>) {
  localStorage.setItem('likedComments', JSON.stringify(Array.from(set)));
}

export default function CommentSection({
  postId,
  isAdmin,
}: {
  postId: number;
  isAdmin: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState('');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyPassword, setReplyPassword] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  async function loadComments() {
    const res = await fetch(`/api/posts/${postId}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    loadComments();
    setLikedIds(getLikedSet());
  }, [postId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!author.trim() || !password.trim() || !content.trim()) {
      setError('이름, 비밀번호, 내용을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, password, content }),
    });
    setSubmitting(false);

    if (res.ok) {
      setAuthor('');
      setPassword('');
      setContent('');
      loadComments();
    } else {
      setError('댓글 작성에 실패했습니다.');
    }
  }

  async function handleReplySubmit(e: FormEvent, parentId: number) {
    e.preventDefault();
    if (!replyAuthor.trim() || !replyPassword.trim() || !replyContent.trim()) return;

    setReplySubmitting(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: replyAuthor,
        password: replyPassword,
        content: replyContent,
        parentId,
      }),
    });
    setReplySubmitting(false);

    if (res.ok) {
      setReplyToId(null);
      setReplyAuthor('');
      setReplyPassword('');
      setReplyContent('');
      loadComments();
    }
  }

  async function handleDelete(commentId: number) {
    if (!confirm('이 댓글을 삭제할까요?')) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) loadComments();
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  async function submitEdit(commentId: number) {
    if (!editContent.trim()) return;
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setEditingId(null);
      loadComments();
    }
  }

  async function handleLike(commentId: number) {
    if (likedIds.has(commentId)) return;
    const res = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, likeCount: data.likeCount } : c))
      );
      const next = new Set(likedIds);
      next.add(commentId);
      setLikedIds(next);
      saveLikedSet(next);
    }
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: number) => comments.filter((c) => c.parentId === id);

  function renderComment(comment: Comment, depth: number) {
    return (
      <div key={comment.id} className={depth > 0 ? 'ml-8 mt-3' : 'border-b pb-4'}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{comment.author}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDateTime(comment.createdAt)}
            </span>
            {isAdmin && (
              <>
                <button
                  onClick={() => startEdit(comment)}
                  className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>

        {editingId === comment.id ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm h-20 dark:bg-gray-800 dark:border-gray-700"
            />
            <div className="flex gap-2">
              <button
                onClick={() => submitEdit(comment.id)}
                className="text-xs bg-black text-white rounded px-3 py-1"
              >
                저장
              </button>
              <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
            {comment.content}
          </p>
        )}

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => handleLike(comment.id)}
            disabled={likedIds.has(comment.id)}
            className={`text-xs flex items-center gap-1 ${
              likedIds.has(comment.id) ? 'text-red-400' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {likedIds.has(comment.id) ? '♥' : '♡'} {comment.likeCount}
          </button>
          {depth === 0 && (
            <button
              onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              답글
            </button>
          )}
        </div>

        {replyToId === comment.id && (
          <form
            onSubmit={(e) => handleReplySubmit(e, comment.id)}
            className="mt-3 space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
          >
            <div className="flex gap-2">
              <input
                value={replyAuthor}
                onChange={(e) => setReplyAuthor(e.target.value)}
                placeholder="이름"
                className="w-1/2 border rounded px-2 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
              />
              <input
                type="password"
                value={replyPassword}
                onChange={(e) => setReplyPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-1/2 border rounded px-2 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="답글을 남겨보세요"
              className="w-full border rounded px-2 py-1.5 text-sm h-16 dark:bg-gray-900 dark:border-gray-700"
            />
            <button
              type="submit"
              disabled={replySubmitting}
              className="bg-black text-white rounded px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {replySubmitting ? '등록 중...' : '답글 등록'}
            </button>
          </form>
        )}

        {repliesOf(comment.id).map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <section className="mt-16">
      <h2 className="text-lg font-semibold mb-4">
        댓글 {comments.length > 0 ? `(${comments.length})` : ''}
      </h2>

      <div className="space-y-4 mb-8">
        {loading && <p className="text-sm text-gray-400">불러오는 중...</p>}
        {!loading && topLevel.length === 0 && (
          <p className="text-sm text-gray-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
        )}
        {topLevel.map((comment) => renderComment(comment, 0))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
      >
        <div className="flex gap-2">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름"
            className="w-1/2 border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-1/2 border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 남겨보세요"
          className="w-full border rounded px-3 py-2 text-sm h-20 dark:bg-gray-900 dark:border-gray-700"
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '댓글 등록'}
        </button>
      </form>
    </section>
  );
}
