'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, Kanban, Mountain, Settings } from 'lucide-react';
import AccountBar from '@/components/AccountBar';
import Brand from '@/components/Brand';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: Mountain },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/kit-studio', label: 'Kit Studio', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const HIDE_ON = ['/login', '/privacy', '/terms', '/reset-password', '/onboarding'];

export default function Sidebar() {
  const pathname = usePathname();
  // Mark the clicked item as active straight away; the page itself may take a
  // moment to arrive, and a menu that doesn't react feels broken.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);

  if (HIDE_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;

  return (
    <>
      {/* Desktop: a calm forest rail. The active item is a brass wash, not a gradient. */}
      <nav
        aria-label="Main"
        className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col gap-1 px-2 py-4 lg:flex"
      >
        <div className="mb-8 mt-2 px-3">
          <Brand compact showTagline />
        </div>

        {NAV_ITEMS.map((item) => {
          const active = (pending ?? pathname) === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setPending(item.href)}
              className={`flex items-center gap-3 rounded-2xl px-[14px] py-[11px] text-[15px] font-semibold transition-colors ${
                active
                  ? 'bg-accent/10 text-text'
                  : 'text-muted hover:bg-white/[0.05] hover:text-text'
              }`}
            >
              <Icon
                size={18}
                strokeWidth={1.7}
                className={active ? 'text-accent' : 'text-muted'}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}

        <AccountBar className="mt-auto px-2 pt-6" />
      </nav>

      {/* Mobile: a floating forest dock. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-20 flex rounded-[22px] bg-surface/95 px-1.5 py-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)] backdrop-blur-md lg:hidden"
        style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border)), 0 18px 40px -18px rgba(0,0,0,.8)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = (pending ?? pathname) === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setPending(item.href)}
              className="flex flex-1 flex-col items-center gap-1 rounded-[17px] py-2 transition-colors"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-accent text-accentInk' : 'text-muted'
                }`}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className={`text-[10.5px] ${active ? 'font-semibold text-text' : 'text-muted'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
