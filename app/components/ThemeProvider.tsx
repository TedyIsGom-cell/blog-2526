'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_THEME, resolveTheme, THEME_STORAGE_KEY, type ThemeId } from '@/lib/theme';

type ThemeContextValue = {
  theme: ThemeId;
  ready: boolean;
  selectTheme: (theme: ThemeId) => boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.remove('dark');
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(resolveTheme(document.documentElement.getAttribute('data-theme')));
    setReady(true);

    function syncTheme(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      // Ignore sessionStorage events; preferences live in localStorage.
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
      } catch { /* Storage can be unavailable in private browser contexts. */ }
      const next = resolveTheme(event.newValue);
      applyTheme(next);
      setTheme(next);
    }

    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const selectTheme = useCallback((next: ThemeId) => {
    applyTheme(next);
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, ready, selectTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
