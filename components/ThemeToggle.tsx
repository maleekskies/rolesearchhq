'use client';

import { useEffect, useState } from 'react';

// Light or dark. Follows the device until you pick one, then remembers it.
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const chosen = document.documentElement.dataset.theme;
    setDark(chosen ? chosen === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('hb-theme', next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setDark(!dark);
  }

  return (
    <button type="button" onClick={toggle} className={`text-xs text-muted underline hover:text-text ${className}`}>
      {dark ? 'Switch to light' : 'Switch to dark'}
    </button>
  );
}
