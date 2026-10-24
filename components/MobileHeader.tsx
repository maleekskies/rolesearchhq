'use client';

import { usePathname } from 'next/navigation';
import Brand from '@/components/Brand';

const HIDE_ON = ['/login', '/privacy', '/terms', '/reset-password', '/onboarding'];

export default function MobileHeader() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (hidden) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Brand compact />
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-water" aria-hidden="true" />
          Private desk
        </span>
      </div>
    </header>
  );
}
