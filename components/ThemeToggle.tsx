'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'rolesearchhq-theme';
const LEGACY_THEME_KEY = 'hb-theme';

// Light or dark. Follows the device until you pick one, then remembers it.
export default function ThemeToggle({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const chosen = document.documentElement.dataset.theme;
    setDark(chosen ? chosen === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
      localStorage.removeItem(LEGACY_THEME_KEY);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setDark(!dark);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
        title={`Switch to ${dark ? 'light' : 'dark'} theme`}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-text ${className}`}
      >
        {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <button type="button" onClick={toggle} className={`text-xs text-muted underline hover:text-text ${className}`}>
      {dark ? 'Switch to light' : 'Switch to dark'}
    </button>
  );
}
