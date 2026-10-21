'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';

type Notification = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  postId: number;
  postTitle: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
      await fetch('/api/notifications/read', { method: 'POST' });
      setUnreadCount(0);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative text-gray-400 hover:text-gray-700"
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white border rounded-xl shadow-lg z-20">
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
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
