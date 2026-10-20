'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';

type Post = { id: number; title: string; slug: string; createdAt: string };
type Category = { id: number; name: string; parentId: number | null };

export default function CategoryDetail({ params }: { params: { id: string } }) {
  const [categoryName, setCategoryName] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState('');
  const [subName, setSubName] = useState('');
  const [subError, setSubError] = useState('');

  async function load() {
    const [postsRes, catsRes] = await Promise.all([
      fetch(`/api/categories/${params.id}/posts`),
      fetch('/api/categories'),
    ]);
    if (postsRes.ok) {
      const data = await postsRes.json();
      setCategoryName(data.category);
      setPosts(data.posts);
    }
    if (catsRes.ok) {
      setAllCategories(await catsRes.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === posts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(posts.map((p) => p.id)));
    }
  }

  async function handleMove() {
    setMessage('');
    if (selected.size === 0 || !target) {
      setMessage('옮길 글과 대상 카테고리를 선택해주세요.');
      return;
    }
    setMoving(true);
    const res = await fetch('/api/categories/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: Array.from(selected), targetCategoryName: target }),
    });
    setMoving(false);

    if (res.ok) {
      setSelected(new Set());
      setTarget('');
      load();
      setMessage('옮겼습니다.');
    } else {
      setMessage('이동에 실패했습니다.');
    }
  }

  async function handleAddSub(e: FormEvent) {
    e.preventDefault();
    setSubError('');
    if (!subName.trim()) return;

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: subName.trim(), parentId: Number(params.id) }),
    });

    if (res.ok) {
      setSubName('');
      load();
    } else {
      const data = await res.json();
      setSubError(data.error || '추가에 실패했습니다.');
    }
  }

  const otherCategories = allCategories.filter((c) => c.id !== Number(params.id));
  const subCategories = allCategories.filter((c) => c.parentId === Number(params.id));

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/admin/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
        ← 대시보드로
      </Link>
      <h1 className="text-2xl font-bold mt-6 mb-2">카테고리: {categoryName}</h1>
      <p className="text-sm text-gray-400 mb-8">글 {posts.length}개</p>

      {/* 하위 카테고리 */}
      <div className="mb-10 border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">하위 카테고리</h2>
        {subCategories.length > 0 ? (
          <ul className="space-y-1 mb-3">
            {subCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/categories/${c.id}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  ↳ {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mb-3">아직 하위 카테고리가 없어요.</p>
        )}
        <form onSubmit={handleAddSub} className="flex gap-2">
          <input
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="하위 카테고리 이름"
            className="border rounded px-3 py-1.5 text-sm flex-1"
          />
          <button type="submit" className="bg-black text-white rounded px-3 py-1.5 text-sm">
            추가
          </button>
        </form>
        {subError && <p className="text-red-500 text-xs mt-2">{subError}</p>}
      </div>

      {/* 글 목록 + 이동 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={toggleAll} className="text-sm text-gray-500 hover:text-gray-800">
          {selected.size === posts.length && posts.length > 0 ? '전체 해제' : '전체 선택'}
        </button>
        <span className="text-sm text-gray-400">{selected.size}개 선택됨</span>
      </div>

      <div className="space-y-2 mb-4">
        {posts.map((post) => (
          <label
            key={post.id}
            className="flex items-center gap-3 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selected.has(post.id)}
              onChange={() => toggle(post.id)}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">{post.title}</p>
              <p className="text-xs text-gray-400">{formatDateTime(post.createdAt)}</p>
            </div>
          </label>
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-gray-400">이 카테고리에는 글이 없습니다.</p>
        )}
      </div>

      {posts.length > 0 && (
        <div className="flex items-center gap-2 border-t pt-4">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
          >
            <option value="">옮길 카테고리 선택</option>
            {otherCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.parentId ? '↳ ' : ''}
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleMove}
            disabled={moving}
            className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {moving ? '이동 중...' : '선택한 글 이동'}
          </button>
        </div>
      )}
      {message && <p className="text-sm text-gray-500 mt-2">{message}</p>}
    </main>
  );
}
