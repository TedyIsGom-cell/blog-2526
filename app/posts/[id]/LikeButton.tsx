'use client';

import { useState, useEffect } from 'react';

export default function LikeButton({
  postId,
  initialCount,
}: {
  postId: number;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    if (likedPosts.includes(postId)) {
      setLiked(true);
    }
  }, [postId]);

  async function handleLike() {
    if (liked || loading) return;
    setLoading(true);
    const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setCount(data.likeCount);
      setLiked(true);
      const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
      localStorage.setItem('likedPosts', JSON.stringify([...likedPosts, postId]));
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={liked || loading}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition ${
        liked
          ? 'bg-red-50 border-red-200 text-red-500'
          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span>{liked ? '♥' : '♡'}</span>
      <span>좋아요 {count}</span>
    </button>
  );
}
