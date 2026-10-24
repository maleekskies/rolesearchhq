import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, CalendarClock, Kanban } from 'lucide-react';

export const metadata: Metadata = { title: 'Pipeline' };
export const dynamic = 'force-dynamic';

const COLUMNS = [
  { status: 'saved', label: 'Saved', dot: 'bg-muted', empty: 'Save a role from Today and it will wait here.' },
  { status: 'kit_ready', label: 'Ready to send', dot: 'bg-accent', empty: 'Approved kits land here, ready for your final read.' },
  { status: 'applied', label: 'Applied', dot: 'bg-water', empty: 'Roles you have sent will show up here.' },
  { status: 'interview', label: 'Interview', dot: 'bg-good', empty: 'Conversations in progress will land here.' },
] as const;

export default async function PipelinePage() {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect('/login');

  // One query: each job brings its kit status along, instead of a second
  // lookup that had to wait for the first.
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, status, match_score, next_action, next_date, interview_at, interview_notes, updated_at, kits(status)')
    .eq('user_id', userId)
    .in('status', COLUMNS.map((c) => c.status))
    .order('updated_at', { ascending: false });

  const kitStatusByJob = new Map(
    (jobs ?? []).map((j) => [j.id, (j.kits as unknown as Array<{ status: string }> | null)?.[0]?.status])
  );

  type PipelineJob = NonNullable<typeof jobs>[number];
  const byStatus = (jobs ?? []).reduce<Record<string, PipelineJob[]>>((acc, job) => {
    (acc[job.status] ??= []).push(job);
    return acc;
  }, {});

  const total = jobs?.length ?? 0;
  const applied = byStatus.applied?.length ?? 0;
  const interviews = byStatus.interview?.length ?? 0;
  const ready = byStatus.kit_ready?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">Outreach board</p>
          <h1 className="mt-2 font-display text-[clamp(38px,4.4vw,56px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text">
            Pipeline
          </h1>
          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
            Every role you have saved, every kit that is ready, and every conversation in motion.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">
              <b>{total}</b> in flight
            </span>
            <span className="chip">
              <b>{ready}</b> ready to send
            </span>
            <span className="chip">
              <b>{applied}</b> applied
            </span>
            <span className="chip">
              <b>{interviews}</b> interview{interviews === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/all?minScore=0" className="btn btn-ghost btn-sm">
            Find more roles
          </Link>
          <Link href="/" className="btn btn-primary btn-sm">
            Back to the map
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnJobs = byStatus[column.status] ?? [];
          return (
            <section
              key={column.status}
              className="w-[276px] shrink-0 rounded-[24px] bg-black/15 p-2.5"
              style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
            >
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${column.dot}`} aria-hidden="true" />
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {column.label}
                  </h2>
                </div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-muted">
                  {columnJobs.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {columnJobs.map((job) => {
                  const kitStatus = kitStatusByJob.get(job.id);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="group block rounded-[18px] bg-surface px-3.5 py-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-surfaceHover"
                      style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold leading-snug text-text">{job.title}</p>
                          <p className="mt-0.5 truncate text-[12.5px] text-muted">{job.company}</p>
                        </div>
                        {job.match_score !== null && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11.5px] font-bold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
                            {job.match_score}
                          </span>
                        )}
                      </div>

                      {job.status === 'interview' && job.interview_at && (
                        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-water">
                          <CalendarClock size={13} aria-hidden="true" />
                          {new Date(job.interview_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                      {job.status === 'interview' && job.interview_notes && (
                        <p className="mt-1.5 truncate text-[11.5px] text-muted">{job.interview_notes}</p>
                      )}
                      {job.status === 'applied' && job.next_date && (
                        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-accent">
                          <CalendarClock size={13} aria-hidden="true" />
                          Follow up {job.next_date}
                        </p>
                      )}
                      {job.status === 'applied' && !job.next_date && (
                        <p className="mt-2.5 text-[11.5px] font-medium text-danger">No follow-up date set</p>
                      )}
                      {job.next_action && job.status !== 'applied' && (
                        <p className="mt-1.5 truncate text-[11.5px] text-muted">{job.next_action}</p>
                      )}
                      {kitStatus && (
                        <span className="mt-2.5 inline-flex rounded-full bg-white/[0.05] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                          kit · {kitStatus.replace('_', ' ')}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {columnJobs.length === 0 && (
                  <div className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center">
                    <Kanban size={18} className="mx-auto text-muted/50" aria-hidden="true" />
                    <p className="mt-2 text-[12px] leading-relaxed text-muted/80">{column.empty}</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-2 text-[11.5px] text-muted/70">
        Tap a card to open the role detail, kit, follow-up date and interview notes.
      </p>
    </div>
  );
}
