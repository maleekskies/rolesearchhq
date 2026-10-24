import Link from 'next/link';
import Brand from '@/components/Brand';
import ContourField from '@/components/ContourField';

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg px-4 py-6 sm:px-8">
      <ContourField className="pointer-events-none absolute inset-0 h-full w-full opacity-40" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Brand compact />
          <Link
            href="/"
            className="text-[12px] font-semibold text-muted underline decoration-muted/30 underline-offset-4 transition-colors hover:text-accent"
          >
            Back to Today
          </Link>
        </div>

        <article className="mt-8 rounded-[28px] bg-surface/95 p-6 shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_28px_60px_-36px_rgba(0,0,0,.8)] backdrop-blur-sm sm:p-9">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-2 font-display text-[clamp(30px,4vw,44px)] font-semibold leading-[1.02] tracking-[-0.035em] text-text">
            {title}
          </h1>
          <p className="mt-2 text-[12px] text-muted">Last updated: {updated}</p>

          <div className="mt-8 flex flex-col gap-7 text-[14px] leading-[1.75] text-muted">{children}</div>
        </article>

        <div className="flex flex-wrap items-center justify-between gap-3 py-7 text-[12px] text-muted/80">
          <span>RoleSearchHQ</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="underline decoration-muted/30 underline-offset-4 hover:text-text">
              Privacy
            </Link>
            <Link href="/terms" className="underline decoration-muted/30 underline-offset-4 hover:text-text">
              Terms
            </Link>
            <Link href="/login" className="underline decoration-muted/30 underline-offset-4 hover:text-text">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-text">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
