'use client';

import { useState, useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import { formatDateAndAgeDays } from '@/lib/format';
import { useTheme } from './ThemeProvider';
import type { ThemeId } from '@/lib/theme';

function NotificationIcon({ theme }: { theme: ThemeId }) {
  if (theme === 'terminal') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 4h18v2H3zM1 6h2v12H1zM21 6h2v12h-2zM3 18h18v2H3zM3 6h2v2H3zM5 8h2v2H5zM7 10h2v2H7zM9 12h6v2H9zM15 10h2v2h-2zM17 8h2v2h-2zM19 6h2v2h-2z" />
    </svg>
  );
  if (theme === 'farm') return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="#704323" d="M5 5h14v2h2v12H3V7h2zM11 19h4v7h-4z" />
      <path fill="#bc8246" d="M5 9h14v8H5zM7 7h10v2H7z" />
      <path fill="#f4bd71" d="M7 9h10v2H7zM5 11h2v4H5zM11 21h2v5h-2z" />
      <path fill="#704323" d="M7 13h8v2H7z" />
      <path fill="#8b352b" d="M19 3h6v6h-4v8h-2z" />
      <path fill="#dc6a48" d="M21 5h2v2h-2z" />
      <path fill="#4e763b" d="M5 22h2v2h2v2H5zM19 22h2v4h-4v-2h2z" />
    </svg>
  );
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4.5 4.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path d="M3.5 13h4.25l1.5 3h5.5l1.5-3h4.25M8 8h8" />
    </svg>
  );
}

type Notification = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  ageDays: number | null;
  postId: number;
  postTitle: string;
};

export default function NotificationBell() {
  const { theme } = useTheme();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelLeft, setPanelLeft] = useState(0);

  useEffect(() => {
    if (!open) return;
    function positionPanel() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(288, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
      setPanelLeft(left - rect.left);
    }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    positionPanel();
    window.addEventListener('resize', positionPanel);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', positionPanel);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  async function load() {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.comments);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      try {
        const res = await fetch('/api/notifications/read', { method: 'POST' });
        if (res.ok) setUnreadCount(0);
      } catch { /* Preserve the unread badge if marking as read failed. */ }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex items-center justify-center shrink-0 hover:bg-gray-50"
        style={{
          width: 36, height: 36,
          color: theme === 'terminal' ? 'var(--ink)' : 'var(--ink-secondary)',
          border: theme === 'terminal' ? '1px solid var(--line)' : '1px solid transparent',
          borderRadius: theme === 'classic' ? 10 : 0,
          backgroundColor: open ? 'var(--surface-soft)' : undefined,
        }}
        aria-label={unreadCount > 0 ? `알림, 읽지 않은 댓글 ${unreadCount}개` : '알림'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <NotificationIcon theme={theme} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 text-[10px] min-w-4 h-4 px-0.5 flex items-center justify-center font-bold"
            style={{
              backgroundColor: theme === 'terminal' ? '#43f578' : theme === 'farm' ? '#a33d29' : '#202833',
              color: theme === 'terminal' ? '#021008' : theme === 'farm' ? '#fff2cf' : '#ffffff',
              borderRadius: theme === 'classic' ? 999 : 0,
              boxShadow: theme === 'farm' ? '1px 1px 0 #704323' : '0 0 0 2px var(--page)',
              fontFamily: theme === 'classic' ? 'inherit' : 'var(--font-pixel)',
            }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className="absolute mt-2 max-h-96 overflow-y-auto bg-white border shadow-lg z-20"
          style={{ left: panelLeft, width: 'min(288px, calc(100vw - 32px))',
            borderRadius: theme === 'classic' ? 12 : 0,
            borderWidth: theme === 'farm' ? 2 : 1,
            borderColor: theme === 'farm' ? '#90572d' : 'var(--line)',
          }}>
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">최근 댓글</p>
          </div>
          {loading && <p className="px-4 py-3 text-sm text-gray-400">불러오는 중...</p>}
          {!loading && notifications.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">아직 댓글이 없어요.</p>
          )}
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={`/posts/${n.postId}`}
              className="block px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
            >
              <p className="text-xs text-gray-400 mb-1 line-clamp-1">{n.postTitle}</p>
              <p className="text-sm font-medium">{n.author}</p>
              <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{n.content}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDateAndAgeDays(n.createdAt, n.ageDays)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
