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
  const markSize = compact ? 'h-8 w-8' : 'h-10 w-10';
  const wordSize = compact ? 'text-lg' : 'text-2xl';

  return (
    <Link
      href={href}
      className={`group inline-flex items-start gap-2.5 ${className}`}
      aria-label="RoleSearchHQ home"
    >
      <BrandMark className={`${markSize} shrink-0 transition-transform duration-200 group-hover:-rotate-3`} />
      <span className="flex min-w-0 flex-col">
        <span className={`font-display font-bold tracking-tight leading-none whitespace-nowrap ${wordSize}`}>
          <span className="text-text">RoleSearch</span>
          <span className="grad-text">HQ</span>
        </span>
        {showTagline && (
          <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
            Job search HQ
          </span>
        )}
      </span>
    </Link>
  );
}
