import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function Brand({
  href = '/',
  compact = false,
  showTagline = false,
  className = '',
}: {
  href?: string;
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const markSize = compact ? 'h-7 w-7' : 'h-9 w-9';
  const wordSize = compact ? 'text-[19px]' : 'text-[22px]';

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="RoleSearchHQ home"
    >
      <BrandMark className={`${markSize} shrink-0 transition-transform duration-200 group-hover:-rotate-3`} />
      <span className="flex min-w-0 flex-col">
        <span
          className={`whitespace-nowrap font-display font-semibold leading-none tracking-[-0.025em] ${wordSize}`}
        >
          <span className="text-text">RoleSearch</span>
          <span className="text-accent">HQ</span>
        </span>
        {showTagline && (
          <span className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.24em] text-muted">
            Your role landscape
          </span>
        )}
      </span>
    </Link>
  );
}
