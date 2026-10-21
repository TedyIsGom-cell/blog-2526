'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function WritePost() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((cats) => setCategoryOptions(cats.map((c: { name: string }) => c.name)));
  }, []);

  function insertAtCursor(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setContent((prev) => prev.slice(0, start) + text + prev.slice(end));
    // 커서를 삽입한 텍스트 뒤로 이동
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

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    setUploading(false);
    e.target.value = '';

    if (res.ok) {
      const data = await res.json();
      insertAtCursor(`\n![](${data.url})\n`);
    } else {
      setError('사진 업로드에 실패했습니다.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category }),
    });

    setSaving(false);

    if (res.ok) {
      router.push('/');
    } else {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">새 글 쓰기</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full border rounded px-3 py-2 text-lg"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="카테고리 (예: 에세이, 소설 / 비워두면 '일반')"
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
              disabled={uploading}
              className="hidden"
            />
          </label>
          <span className="text-xs text-gray-400">
            커서 위치에 사진이 자동으로 삽입돼요
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`내용을 입력하세요...\n\n유튜브 넣기: 유튜브 링크를 한 줄에 단독으로 입력하면 자동으로 삽입돼요.`}
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
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-black text-white rounded px-6 py-2 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '발행하기'}
        </button>
      </form>
    </main>
  );
}
