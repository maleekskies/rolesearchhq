import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import JobList from '@/components/JobList';
import AddJobForm from '@/components/AddJobForm';
import ScanButton from '@/components/ScanButton';
import ScoreUrlForm from '@/components/ScoreUrlForm';

export const metadata: Metadata = { title: 'All matches' };
export const dynamic = 'force-dynamic';

const PAGE_STEP = 100;
const MAX_ROWS = 600;
const LIST_COLUMNS =
  'id, title, company, location, status, match_score, match_why, fit_tags, match_gaps, domain_score, skills_score, seniority_score, location_score, posted_at, first_seen_at, fingerprint';

export default async function AllMatchesPage({
  searchParams,
}: {
  searchParams: { first_run?: string; minScore?: string; sort?: string; q?: string; limit?: string };
}) {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profile')
    .select('onboarded_at, target_titles, locations, must_haves, min_match')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect('/onboarding');

  const minMatch = profile.min_match ?? 70;
  // The Inbox opens at your cutoff. "Show everything" passes minScore=0.
  const parsedMin = searchParams.minScore !== undefined ? Number(searchParams.minScore) : minMatch;
  const activeMinScore = Number.isFinite(parsedMin) ? parsedMin : minMatch;
  const sort = searchParams.sort === 'score' ? 'score' : 'recent';
  const query = searchParams.q?.trim();
  // Search text goes into a PostgREST filter string, so strip its control characters.
  const safeQuery = query?.replace(/[,()%*\\]/g, ' ').trim();
  const pageSize = Math.min(MAX_ROWS, Math.max(PAGE_STEP, Number(searchParams.limit) || PAGE_STEP));

  // Only the columns the list actually shows. Descriptions and raw board data
  // are ~7KB per job and used to be sent for every row, on every visit.
  // Jobs you've touched (saved, applied...) always show; untouched ones only
  // when they meet the cutoff. Two small queries run side by side.
  let touchedQ = supabase.from('jobs').select(LIST_COLUMNS).eq('user_id', userId).in('status', ['saved', 'kit_ready', 'applied', 'interview', 'offer']);
  let freshQ = supabase
    .from('jobs')
    .select(LIST_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'new');

  if (activeMinScore > 0) freshQ = freshQ.gte('match_score', activeMinScore);
  if (safeQuery) {
    const filter = `title.ilike.%${safeQuery}%,company.ilike.%${safeQuery}%`;
    touchedQ = touchedQ.or(filter);
    freshQ = freshQ.or(filter);
  }
  if (sort === 'score') {
    touchedQ = touchedQ.order('match_score', { ascending: false, nullsFirst: false }).order('first_seen_at', { ascending: false });
    freshQ = freshQ.order('match_score', { ascending: false, nullsFirst: false }).order('first_seen_at', { ascending: false });
  } else {
    touchedQ = touchedQ.order('first_seen_at', { ascending: false });
    freshQ = freshQ.order('first_seen_at', { ascending: false });
  }

  const [touchedRes, freshRes] = await Promise.all([touchedQ.limit(300), freshQ.limit(pageSize)]);
  const touched = touchedRes.data ?? [];
  const fresh = freshRes.data ?? [];
  const freshTotal = freshRes.count ?? fresh.length;

  const visible = [...touched, ...fresh].sort((x, y) => {
    if (sort === 'score') {
      const diff = (y.match_score ?? -1) - (x.match_score ?? -1);
      if (diff !== 0) return diff;
    }
    return String(y.first_seen_at).localeCompare(String(x.first_seen_at));
  });

  const newCount = freshTotal;
  const readyToReview = touched.filter((j) => j.status === 'kit_ready');
  const inPipeline = touched.filter((j) => ['saved', 'kit_ready', 'applied', 'interview'].includes(j.status)).length;
  const avgMatch = visible.length
    ? Math.round(visible.reduce((sum, j) => sum + (j.match_score ?? 0), 0) / visible.length)
    : null;
  const hasMore = freshTotal > fresh.length && pageSize < MAX_ROWS;

  function moreLink() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeMinScore !== minMatch) params.set('minScore', String(activeMinScore));
    if (sort !== 'recent') params.set('sort', sort);
    params.set('limit', String(pageSize + PAGE_STEP));
    return `/all?${params.toString()}`;
  }

  function sortLink(target: string) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeMinScore !== minMatch) params.set('minScore', String(activeMinScore));
    params.set('sort', target);
    return `/all?${params.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
      {searchParams.first_run && (
        <div className="mb-6 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm text-text">
          These are scored against the profile you just wrote. Open one to see why, or save it to your pipeline.
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">Everything we found</p>
          <h1 className="mt-2 font-display text-[clamp(38px,4.4vw,56px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text">
            All matches
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
            {visible.length > 0 || freshTotal > 0
              ? activeMinScore > 0
                ? `${visible.length} roles at or above ${activeMinScore} match${hasMore ? ` (showing the first ${fresh.length} new ones)` : ''}.`
                : `${visible.length} roles, ${sort === 'score' ? 'highest match first' : 'newest first'}.`
              : 'Nothing here yet. Scan the boards or add a role by URL.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScanButton />
          <Link href="/" className="btn btn-ghost btn-sm">
            Back to the map
          </Link>
        </div>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New matches" value={newCount} />
        <Stat label="Ready to review" value={readyToReview.length} accent />
        <Stat label="In pipeline" value={inPipeline} />
        <Stat label="Avg match" value={avgMatch ?? 'n/a'} sub={`cutoff ${minMatch}`} />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-black/10 p-3 sm:flex-row sm:flex-wrap sm:items-center" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
        <AddJobForm />
        <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <ScoreUrlForm />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <form action="/all" method="get" className="flex w-full gap-2 sm:w-auto">
          {sort !== 'recent' && <input type="hidden" name="sort" value={sort} />}
          {activeMinScore !== minMatch && <input type="hidden" name="minScore" value={activeMinScore} />}
          <input
            type="text"
            name="q"
            defaultValue={query ?? ''}
            placeholder="Search by title or company"
            className="field-input w-full py-2.5 text-[13.5px] sm:w-80"
          />
          <button type="submit" className="btn btn-ghost btn-sm">Search</button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-muted">Sort</span>
          <Link
            href={sortLink('recent')}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              sort === 'recent' ? 'bg-accent/10 font-semibold text-accent' : 'text-muted hover:text-text'
            }`}
          >
            Recent
          </Link>
          <Link
            href={sortLink('score')}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              sort === 'score' ? 'bg-accent/10 font-semibold text-accent' : 'text-muted hover:text-text'
            }`}
          >
            Score
          </Link>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          {activeMinScore > 0 ? (
            <Link href="/all?minScore=0" className="text-muted underline decoration-muted/30 underline-offset-4 hover:text-accent">
              Show everything
            </Link>
          ) : (
            <Link
              href={`/all?minScore=${minMatch}`}
              className="text-muted underline decoration-muted/30 underline-offset-4 hover:text-accent"
            >
              Only {minMatch}+
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <JobList jobs={visible} />
          {hasMore && (
            <Link href={moreLink()} className="mt-4 block text-center text-sm font-semibold text-accent hover:underline">
              Show more ({freshTotal - fresh.length} more new roles)
            </Link>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
          <div className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[16px] font-semibold text-text">Review queue</h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] tabular-nums text-accent">
                {readyToReview.length}
              </span>
            </div>
            {readyToReview.length === 0 ? (
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                No kits waiting on you right now. Save a role and its kit will appear here.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {readyToReview.slice(0, 3).map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/kit-studio?job=${job.id}`}
                      className="block rounded-xl bg-black/15 px-3 py-2.5 text-[13px] text-text transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="block truncate">{job.title}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-muted">{job.company}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[16px] font-semibold text-text">Targeting</h2>
              <Link href="/settings" className="text-[11.5px] font-semibold text-accent hover:underline">
                Edit
              </Link>
            </div>
            <dl className="mt-3 flex flex-col gap-2.5 text-[12px]">
              <SnapshotRow label="Titles" values={profile.target_titles} />
              <SnapshotRow label="Locations" values={profile.locations} />
              <SnapshotRow label="Must-haves" values={profile.must_haves} />
              <div>
                <dt className="mb-0.5 text-muted">Min match</dt>
                <dd className="text-text">{minMatch}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3.5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
      <p className={`font-display text-[28px] font-semibold leading-none tabular-nums ${accent ? 'text-accent' : 'text-text'}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[10.5px] text-muted/70">{sub}</p>}
    </div>
  );
}

function SnapshotRow({ label, values }: { label: string; values: string[] | null }) {
  return (
    <div>
      <dt className="mb-0.5 text-muted">{label}</dt>
      <dd className="leading-relaxed text-text">{values && values.length > 0 ? values.join(', ') : 'Not set'}</dd>
    </div>
  );
}
