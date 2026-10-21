'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditPost() {
  const { id } = useParams<{ id: string }>();
  const [admin, setAdmin] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then((response) => response.ok ? response.json() : [])
      .then((categories) => setCategoryOptions(Array.isArray(categories) ? categories.map((category: { name: string }) => category.name) : []))
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPost() {
      setLoading(true);
      setAdmin(false);
      setLoadError('');
      try {
        const [response, meResponse] = await Promise.all([fetch(`/api/posts/${id}`, { cache: 'no-store' }), fetch('/api/auth/me', { cache: 'no-store' })]);
        const post = await response.json();
        if (!response.ok) throw new Error(post.error || '글을 불러올 수 없습니다.');
        const me = meResponse.ok ? await meResponse.json() : null;
        if (!me?.user) throw new Error('로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.');
        if (!active) return;
        setTitle(post.title);
        setCategory(post.category);
        setContent(post.content);
        setAdmin(me?.user?.role === 'ADMIN');
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해주세요.');
      } finally { if (active) setLoading(false); }
    }
    void loadPost();
    return () => { active = false; };
  }, [id]);

  function insertAtCursor(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setContent((prev) => prev.slice(0, start) + text + prev.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    });
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '사진 업로드에 실패했습니다.');
      insertAtCursor(`\n![](${data.url})\n`);
    } catch (error) { setError(error instanceof Error ? error.message : '사진 업로드에 실패했습니다.'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '저장에 실패했습니다. 다시 시도해주세요.');
      router.push(`/posts/${id}`);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해주세요.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!admin || !confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '삭제에 실패했습니다.');
      router.push('/admin/dashboard');
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인해주세요.'); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </main>
    );
  }

  if (loadError) return <main className="max-w-2xl mx-auto px-6 py-16"><Link href="/admin/dashboard" className="text-sm underline">← 글 관리로</Link><p role="alert" className="text-red-600 mt-6">{loadError}</p><button onClick={() => window.location.reload()} className="text-sm underline mt-4">다시 불러오기</button></main>;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/admin/dashboard" className="block text-sm text-gray-500 mb-6 hover:underline">← 글 관리로</Link>
      <h1 className="text-2xl font-bold mb-6">글 수정</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          aria-label="제목"
          required
          maxLength={300}
          className="w-full border rounded px-3 py-2 text-lg"
        />
        <input
          value={category}
          aria-label="카테고리"
          maxLength={100}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="카테고리"
          className="w-full border rounded px-3 py-2 text-sm"
          list="category-options"
        />
        <datalist id="category-options">
          {categoryOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="flex items-center gap-3">
          <label className="text-sm border rounded-full px-4 py-1.5 text-gray-600 hover:bg-gray-50 cursor-pointer">
            {uploading ? '업로드 중...' : '📎 사진 첨부'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={uploading || saving}
              className="hidden"
            />
          </label>
          <span className="text-xs text-gray-400">
            커서 위치에 사진이 자동으로 삽입돼요
          </span>
        </div>

        <textarea
          ref={textareaRef}
          aria-label="본문"
          maxLength={200000}
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요..."
          className="w-full border rounded px-3 py-2 h-96"
        />
        <p className="text-xs text-gray-400">
          <strong>**굵게**</strong>, <em>*기울임*</em>, <code className="bg-gray-100 px-1 rounded">`코드`</code>,{' '}
          <code className="bg-gray-100 px-1 rounded"># 제목</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">&gt; 인용</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">- 목록</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">[링크](주소)</code> 문법을 쓸 수 있어요.
          유튜브는 링크를 한 줄에 단독으로 넣으면 자동 삽입돼요.
        </p>
        {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-black text-white rounded px-6 py-2 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '수정 완료'}
          </button>
          {admin && <button
            type="button"
            onClick={handleDelete}
            disabled={saving || uploading}
            className="text-sm text-red-500 hover:text-red-700"
          >
            이 글 삭제하기
          </button>}
        </div>
      </form>
    </main>
  );
}
