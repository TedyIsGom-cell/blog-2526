'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { formatDateAndAgeDays } from '@/lib/format';

type Comment = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  parentId: number | null;
  ageDays: number | null;
};

function getLikedSet(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('likedComments') || '[]');
    return new Set(Array.isArray(stored) ? stored.filter((id): id is number => Number.isSafeInteger(id)) : []);
  } catch { return new Set(); }
}

function saveLikedSet(set: Set<number>) {
  try { localStorage.setItem('likedComments', JSON.stringify(Array.from(set))); } catch { /* Likes still work with browser storage disabled. */ }
}

export default function CommentSection({ postId, isAdmin, viewer = null }: {
  postId: number;
  isAdmin: boolean;
  viewer?: { name: string } | null;
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
  const [replyError, setReplyError] = useState('');

  const loadComments = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '댓글을 불러오지 못했습니다.');
      if (!signal?.aborted) setComments(data);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : '댓글을 불러오지 못했습니다.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [postId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setComments([]); setReplyToId(null);
    void loadComments(controller.signal);
    setLikedIds(getLikedSet());
    return () => controller.abort();
  }, [loadComments]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!content.trim() || (!viewer && (!author.trim() || !password.trim()))) {
      setError(viewer ? '댓글 내용을 입력해주세요.' : '이름, 비밀번호, 내용을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viewer ? { content } : { author, password, content }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '댓글 작성에 실패했습니다.');
      setAuthor(''); setPassword(''); setContent('');
      await loadComments();
    } catch (err) { setError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.'); }
    finally { setSubmitting(false); }
  }

  async function handleReplySubmit(event: FormEvent, parentId: number) {
    event.preventDefault(); setReplyError('');
    if (!replyContent.trim() || (!viewer && (!replyAuthor.trim() || !replyPassword.trim()))) {
      setReplyError(viewer ? '답글 내용을 입력해주세요.' : '이름, 비밀번호, 내용을 모두 입력해주세요.');
      return;
    }
    setReplySubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentId, ...(!viewer && { author: replyAuthor, password: replyPassword }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '답글 작성에 실패했습니다.');
      setReplyToId(null); setReplyAuthor(''); setReplyPassword(''); setReplyContent('');
      await loadComments();
    } catch (err) { setReplyError(err instanceof Error ? err.message : '답글 작성에 실패했습니다.'); }
    finally { setReplySubmitting(false); }
  }

  async function handleDelete(commentId: number) {
    if (!window.confirm('이 댓글을 삭제할까요?')) return;
    setError('');
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('댓글을 삭제하지 못했습니다. 권한을 확인해주세요.');
      await loadComments();
    } catch (err) { setError(err instanceof Error ? err.message : '삭제 요청에 실패했습니다.'); }
  }

  function startEdit(comment: Comment) { setEditingId(comment.id); setEditContent(comment.content); }

  async function submitEdit(commentId: number) {
    if (!editContent.trim()) return;
    setError('');
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editContent }),
      });
      if (!response.ok) throw new Error('댓글을 수정하지 못했습니다. 권한을 확인해주세요.');
      setEditingId(null);
      await loadComments();
    } catch (err) { setError(err instanceof Error ? err.message : '수정 요청에 실패했습니다.'); }
  }

  async function handleLike(commentId: number) {
    if (likedIds.has(commentId)) return;
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
      if (!response.ok) throw new Error('좋아요 요청에 실패했습니다.');
      const data = await response.json();
      setComments(prev => prev.map(comment => comment.id === commentId ? { ...comment, likeCount: data.likeCount } : comment));
      setLikedIds(prev => { const next = new Set(prev); next.add(commentId); saveLikedSet(next); return next; });
    } catch (err) { setError(err instanceof Error ? err.message : '좋아요 요청에 실패했습니다.'); }
  }

  const topLevel = comments.filter(comment => !comment.parentId);
  const repliesOf = (id: number) => comments.filter(comment => comment.parentId === id);

  function renderComment(comment: Comment, depth: number) {
    return <div key={comment.id} className={depth > 0 ? 'ml-4 sm:ml-8 mt-3' : 'border-b pb-4'}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <span className="font-medium text-sm">{comment.author}</span>
        <div className="flex items-center flex-wrap gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateAndAgeDays(comment.createdAt, comment.ageDays)}</span>
          {isAdmin && <>
            <button onClick={() => startEdit(comment)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">수정</button>
            <button onClick={() => handleDelete(comment.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
          </>}
        </div>
      </div>
      {editingId === comment.id ? <div className="mt-2 space-y-2">
        <textarea aria-label="댓글 수정 내용" value={editContent} onChange={event => setEditContent(event.target.value)} maxLength={10000} className="w-full border rounded px-2 py-1 text-sm h-20 dark:bg-gray-800 dark:border-gray-700" />
        <div className="flex gap-2"><button onClick={() => submitEdit(comment.id)} className="text-xs bg-black text-white rounded px-3 py-1">저장</button><button onClick={() => setEditingId(null)} className="text-xs text-gray-400">취소</button></div>
      </div> : <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>}
      <div className="flex items-center gap-4 mt-2">
        <button onClick={() => handleLike(comment.id)} disabled={likedIds.has(comment.id)} className={`text-xs flex items-center gap-1 ${likedIds.has(comment.id) ? 'text-red-400' : 'text-gray-400 hover:text-gray-600'}`}>{likedIds.has(comment.id) ? '♥' : '♡'} {comment.likeCount}</button>
        {depth === 0 && <button onClick={() => { setReplyToId(replyToId === comment.id ? null : comment.id); setReplyError(''); }} className="text-xs text-gray-400 hover:text-gray-600">답글</button>}
      </div>
      {replyToId === comment.id && <form onSubmit={event => handleReplySubmit(event, comment.id)} className="mt-3 space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        {viewer ? <p className="text-xs text-gray-500">{viewer.name} 님으로 답글을 남깁니다.</p> : <>
          <div className="flex gap-2"><input aria-label="답글 작성자 이름" value={replyAuthor} onChange={event => setReplyAuthor(event.target.value)} placeholder="이름" required maxLength={80} className="w-1/2 border rounded px-2 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700" /><input aria-label="답글 비밀번호" type="password" value={replyPassword} onChange={event => setReplyPassword(event.target.value)} placeholder="비밀번호" required maxLength={256} className="w-1/2 border rounded px-2 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700" /></div>
          <p className="text-xs text-gray-500">비회원 답글은 생일 미등록으로 표시됩니다. <Link href="/login" className="underline">로그인</Link>하면 내 생일을 기준으로 표시합니다.</p>
        </>}
        <textarea aria-label="답글 내용" value={replyContent} onChange={event => setReplyContent(event.target.value)} placeholder="답글을 남겨보세요" required maxLength={10000} className="w-full border rounded px-2 py-1.5 text-sm h-16 dark:bg-gray-900 dark:border-gray-700" />
        {replyError && <p role="alert" className="text-red-500 text-xs">{replyError}</p>}
        <button type="submit" disabled={replySubmitting} className="bg-black text-white rounded px-3 py-1.5 text-xs disabled:opacity-50">{replySubmitting ? '등록 중…' : '답글 등록'}</button>
      </form>}
      {repliesOf(comment.id).map(reply => renderComment(reply, depth + 1))}
    </div>;
  }

  return <section className="mt-16">
    <h2 className="text-lg font-semibold mb-4">댓글 {comments.length > 0 ? `(${comments.length})` : ''}</h2>
    <div className="space-y-4 mb-8">
      {loading && <p className="text-sm text-gray-400">불러오는 중…</p>}
      {!loading && topLevel.length === 0 && <p className="text-sm text-gray-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>}
      {topLevel.map(comment => renderComment(comment, 0))}
    </div>
    <form onSubmit={handleSubmit} className="space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      {viewer ? <p className="text-sm text-gray-500">{viewer.name} 님으로 댓글을 남깁니다.</p> : <>
        <div className="flex gap-2"><input aria-label="댓글 작성자 이름" value={author} onChange={event => setAuthor(event.target.value)} placeholder="이름" required maxLength={80} className="w-1/2 border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700" /><input aria-label="댓글 비밀번호" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="비밀번호" required maxLength={256} className="w-1/2 border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700" /></div>
        <p className="text-xs text-gray-500">비회원 댓글은 생일 미등록으로 표시됩니다. <Link href="/login" className="underline">로그인</Link>하면 내 생일을 기준으로 표시합니다.</p>
      </>}
      <textarea aria-label="댓글 내용" value={content} onChange={event => setContent(event.target.value)} placeholder="댓글을 남겨보세요" required maxLength={10000} className="w-full border rounded px-3 py-2 text-sm h-20 dark:bg-gray-900 dark:border-gray-700" />
      {error && <p role="alert" className="text-red-500 text-xs">{error}</p>}
      <button type="submit" disabled={submitting} className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50">{submitting ? '등록 중…' : '댓글 등록'}</button>
    </form>
  </section>;
}
