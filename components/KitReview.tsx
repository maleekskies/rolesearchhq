'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Job, Kit } from '@/lib/types';
import { ArrowUpRight, Check, Clipboard, PencilLine } from 'lucide-react';

export default function KitReview({ job, kit }: { job: Job; kit: Kit }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy cover letter');

  async function setKitStatus(status: 'approved' | 'needs_edit') {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: kitError } = await supabase
      .from('kits')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', kit.id);

    if (kitError) {
      setBusy(false);
      setError(kitError.message);
      return;
    }

    if (status === 'approved') {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'kit_ready', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      if (jobError) {
        setBusy(false);
        setError(jobError.message);
        return;
      }
    }

    setBusy(false);
    router.refresh();
  }

  async function handleCopyLetter() {
    if (!kit.cover_letter) return;
    try {
      await navigator.clipboard.writeText(kit.cover_letter);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy cover letter'), 1500);
    } catch {
      setCopyLabel('Copy failed, select the text manually');
      setTimeout(() => setCopyLabel('Copy cover letter'), 2000);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Tailored kit</p>
          <h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.05] tracking-[-0.035em] text-text">
            {job.title}
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            <b className="font-semibold text-text/90">{job.company}</b>
            {job.location ? ` · ${job.location}` : ''}
          </p>
        </div>
        {job.match_score !== null && (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[22px] font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/25">
            {job.match_score}
          </div>
        )}
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-2xl bg-black/15 p-3" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
        <StatusBadge status={kit.status} />
        {kit.status !== 'approved' && (
          <button
            onClick={() => setKitStatus('approved')}
            disabled={busy}
            className="btn btn-primary btn-sm disabled:opacity-50"
          >
            <Check size={15} aria-hidden="true" />
            Approve kit
          </button>
        )}
        {kit.status !== 'needs_edit' && (
          <button
            onClick={() => setKitStatus('needs_edit')}
            disabled={busy}
            className="btn btn-ghost btn-sm disabled:opacity-50"
          >
            <PencilLine size={14} aria-hidden="true" />
            Needs edit
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted/75">
          {kit.status === 'approved'
            ? 'Approved and ready to send.'
            : 'Nothing is sent from RoleSearchHQ. Approve means ready for your final send.'}
        </span>
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-[18px] font-semibold text-text">Tailored CV</h2>
              <span className="text-[11px] text-muted">Reordered from your master CV</span>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-4 font-sans text-[13.5px] leading-[1.65] text-text/90">
              {kit.tailored_cv_md}
            </pre>
          </section>

          <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[18px] font-semibold text-text">Cover letter</h2>
              <button onClick={handleCopyLetter} className="btn btn-ghost btn-sm text-[12px]">
                <Clipboard size={14} aria-hidden="true" />
                {copyLabel}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-[13.5px] leading-[1.7] text-text/90">
              {kit.cover_letter}
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {kit.talking_points && kit.talking_points.length > 0 && (
            <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <p className="eyebrow">Talking points</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {kit.talking_points.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-text/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {kit.gap_note && (
            <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <p className="eyebrow">Gap handling</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{kit.gap_note}</p>
            </section>
          )}

          <Link href={`/jobs/${job.id}`} className="btn btn-ghost btn-sm w-full">
            Open full job detail
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-water/10 text-water ring-water/20',
    needs_edit: 'bg-warnBg/70 text-warnInk ring-warnLine/40',
    approved: 'bg-accent/10 text-accent ring-accent/20',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${styles[status] ?? styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
