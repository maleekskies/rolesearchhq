'use client';

import { usePathname } from 'next/navigation';
import Brand from '@/components/Brand';
import ThemeToggle from '@/components/ThemeToggle';

const HIDE_ON = ['/login', '/privacy', '/terms', '/reset-password', '/onboarding'];

export default function MobileHeader() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (hidden) return null;

  return (
    <header className="md:hidden sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Brand compact />
        <ThemeToggle compact />
      </div>
    </header>
  );
}
