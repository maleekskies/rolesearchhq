import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, FileText } from 'lucide-react';
import KitReview from '@/components/KitReview';

export const metadata: Metadata = { title: 'Kit Studio' };
export const dynamic = 'force-dynamic';

function kitStatusLabel(status: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'needs_edit') return 'Needs edits';
  if (status === 'draft') return 'Draft ready';
  return status;
}

function kitStatusClass(status: string): string {
  if (status === 'approved') return 'bg-accent/10 text-accent ring-accent/20';
  if (status === 'needs_edit') return 'bg-warnBg/70 text-warnInk ring-warnLine/40';
  return 'bg-water/10 text-water ring-water/20';
}

export default async function KitStudioPage({
  searchParams,
}: {
  searchParams: { job?: string };
}) {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect('/login');

  if (!searchParams.job) {
    const { data: recentKits } = await supabase
      .from('kits')
      .select('job_id, status, generated_at, jobs!inner(id, title, company, user_id)')
      .eq('jobs.user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(10);

    return (
      <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
        <header>
          <p className="eyebrow">One kit, one role</p>
          <h1 className="mt-2 font-display text-[clamp(38px,4.4vw,56px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text">
            Kit Studio
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
            Every kit is drafted for a single role and pulled only from your CV, voice guide and proof points.
            Approve is the only path that allows a send.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          <span className="chip">
            <b>{recentKits?.length ?? 0}</b> recent kit{recentKits?.length === 1 ? '' : 's'}
          </span>
          <Link href="/" className="chip transition-colors hover:text-text">
            Back to the map
          </Link>
        </div>

        {!recentKits || recentKits.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <FileText size={24} className="mx-auto text-muted/50" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[22px] font-semibold text-text">No kits yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
              Pick a match from Today. RoleSearchHQ will draft a kit for that role only — tailored CV, cover
              letter and form packet.
            </p>
            <Link href="/" className="btn btn-primary btn-sm mt-5">
              Find a role
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(recentKits as unknown as Array<{
              job_id: string;
              status: string;
              generated_at: string | null;
              jobs: { id: string; title: string; company: string };
            }>).map((k) => (
              <li key={k.job_id}>
                <Link
                  href={`/kit-studio?job=${k.job_id}`}
                  className="group flex h-full items-start justify-between gap-4 rounded-2xl bg-surface px-4 py-4 transition-all duration-150 hover:-translate-y-0.5 hover:bg-surfaceHover"
                  style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-text">{k.jobs.title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">{k.jobs.company}</p>
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${kitStatusClass(k.status)}`}>
                      {kitStatusLabel(k.status)}
                    </span>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="mt-0.5 shrink-0 text-muted transition-colors group-hover:text-accent"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [{ data: job }, { data: kit }] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', searchParams.job).eq('user_id', userId).maybeSingle(),
    supabase
      .from('kits')
      .select('*')
      .eq('job_id', searchParams.job)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!job || !kit) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
        <Link href="/kit-studio" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-text">
          <ArrowLeft size={14} aria-hidden="true" /> Kit Studio
        </Link>
        <h1 className="mt-5 font-display text-[32px] font-semibold tracking-[-0.03em] text-text">
          No kit found for that role yet
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Open the role from Today and generate one first. The kit will then live here.
        </p>
        <Link href="/" className="btn btn-primary btn-sm mt-5">
          Back to Today
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/kit-studio" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-text">
          <ArrowLeft size={14} aria-hidden="true" /> Kit Studio
        </Link>
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted">One role · one kit</span>
      </div>
      <KitReview job={job} kit={kit} />
    </div>
  );
}
