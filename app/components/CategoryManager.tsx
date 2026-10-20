'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

type Category = {
  id: number;
  name: string;
  parentId: number | null;
  postCount: number;
};

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  async function load() {
    const res = await fetch('/api/categories');
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!newName.trim()) return;

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.ok) {
      setNewName('');
      load();
    } else {
      const data = await res.json();
      setError(data.error || '추가에 실패했습니다.');
    }
  }

  async function handleDelete(id: number, name: string) {
    if (name === '일반') {
      alert("'일반' 카테고리는 삭제할 수 없어요.");
      return;
    }
    if (!confirm(`'${name}' 카테고리를 삭제할까요? 이 카테고리의 글은 '일반'으로 옮겨집니다.`)) {
      return;
    }
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  async function submitEdit(id: number) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await res.json();
      alert(data.error || '변경에 실패했습니다.');
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">불러오는 중...</p>;
  }

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: number) => categories.filter((c) => c.parentId === parentId);
  const ordered: Category[] = [];
  topLevel.forEach((c) => {
    ordered.push(c);
    childrenOf(c.id).forEach((child) => ordered.push(child));
  });

  return (
    <div>
      <div className="space-y-2 mb-4">
        {ordered.map((cat) => (
          <div
            key={cat.id}
            className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
              cat.parentId ? 'ml-6 bg-gray-50' : ''
            }`}
          >
            {editingId === cat.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border rounded px-2 py-1 text-sm flex-1"
                  placeholder="새 이름 (기존 이름과 같으면 그 카테고리로 병합)"
                />
                <button
                  onClick={() => submitEdit(cat.id)}
                  className="text-xs bg-black text-white rounded px-3 py-1"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400"
                >
                  취소
                </button>
              </div>
            ) : (
              <>
                <Link href={`/admin/categories/${cat.id}`} className="text-sm hover:underline">
                  {cat.parentId ? '↳ ' : ''}
                  {cat.name} <span className="text-gray-400">({cat.postCount})</span>
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    이름변경/옮기기
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="border rounded px-3 py-2 text-sm flex-1"
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2 text-sm">
          추가
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      <p className="text-xs text-gray-400 mt-3">
        카테고리 이름을 클릭하면 그 안의 글을 체크박스로 골라서 다른 카테고리로 옮기거나, 하위
        카테고리를 만들 수 있어요. "이름변경/옮기기"에 이미 있는 다른 카테고리 이름을 입력하면,
        그 카테고리로 글이 전부 옮겨지고 지금 이 카테고리는 사라집니다.
      </p>
    </div>
  );
}
