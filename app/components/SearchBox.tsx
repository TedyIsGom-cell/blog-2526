'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion =
  | { type: 'post'; label: string; href: string }
  | { type: 'category'; label: string; href: string };

export default function SearchBox({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(value)}`);
      if (!res.ok) return;
      const data = await res.json();
      const combined: Suggestion[] = [
        ...data.categories.map((c: { name: string }) => ({
          type: 'category' as const,
          label: c.name,
          href: `/category/${encodeURIComponent(c.name)}`,
        })),
        ...data.posts.map((p: { id: number; title: string }) => ({
          type: 'post' as const,
          label: p.title,
          href: `/posts/${p.id}`,
        })),
      ];
      setSuggestions(combined);
      setOpen(combined.length > 0);
    }, 200);
  }

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goTo(suggestions[activeIndex].href);
      return;
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="글 검색하기... (카테고리도 함께 검색돼요)"
          className="w-full border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          autoComplete="off"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border rounded-xl shadow-sm overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={`${s.type}-${s.label}`}>
              <button
                onMouseDown={() => goTo(s.href)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-gray-400 text-xs">
                  {s.type === 'category' ? '카테고리' : '글'}
                </span>
                <span className="text-gray-800">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
