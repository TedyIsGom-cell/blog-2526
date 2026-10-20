'use client';

import { useState, useEffect } from 'react';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      aria-label="다크모드 전환"
      className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
