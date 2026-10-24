import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContourField from '@/components/ContourField';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-5 py-10">
      <ContourField className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
      <div className="relative z-10 w-full max-w-xl text-center">
        <p className="eyebrow">Off the map</p>
        <p className="mt-4 font-display text-[clamp(76px,16vw,140px)] font-semibold leading-none tracking-[-0.07em] text-accent">
          404
        </p>
        <h1 className="mt-3 font-display text-[28px] font-semibold tracking-[-0.03em] text-text">
          That page isn&apos;t here.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
          The job or page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link href="/" className="btn btn-primary btn-sm mt-7">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Today
        </Link>
      </div>
    </div>
  );
}
