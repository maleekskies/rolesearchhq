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
    <div className="px-6 py-10 pb-24 md:pb-10">
      {searchParams.first_run && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 mb-6 text-sm text-text">
          These are scored against the profile you just wrote. Open one to see why.
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-display text-3xl text-text mb-1">All matches</h1>
        <p className="text-muted">
          {visible.length > 0 || freshTotal > 0
            ? activeMinScore > 0
              ? `${visible.length} roles at or above ${activeMinScore} match${hasMore ? ` (showing the first ${fresh.length} new ones)` : ''}.`
              : `${visible.length} roles, ${sort === 'score' ? 'highest match first' : 'newest first'}.`
            : 'Nothing here yet.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="New matches" value={newCount} />
        <Stat label="Ready to review" value={readyToReview.length} />
        <Stat label="In pipeline" value={inPipeline} />
        <Stat label="Avg match" value={avgMatch ?? 'n/a'} sub={`cutoff ${minMatch}`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <ScanButton />
        <AddJobForm />
      </div>

      <div className="mb-4">
        <ScoreUrlForm />
      </div>

      <form className="mb-4" action="/all" method="get">
        {sort !== 'recent' && <input type="hidden" name="sort" value={sort} />}
        <input
          type="text"
          name="q"
          defaultValue={query ?? ''}
          placeholder="Search by title or company"
          className="w-full sm:w-80 bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
      </form>

      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2 text-muted">
          <span>Sort:</span>
          <Link href={sortLink('recent')} className={sort === 'recent' ? 'text-text font-medium' : 'hover:text-text'}>
            Recent
          </Link>
          <span>·</span>
          <Link href={sortLink('score')} className={sort === 'score' ? 'text-text font-medium' : 'hover:text-text'}>
            Score, highest first
          </Link>
        </div>
        {activeMinScore > 0 ? (
          <div className="text-muted">
            <span>Showing {activeMinScore}+ only.</span>{' '}
            <Link href="/all?minScore=0" className="text-accent hover:underline">
              Show everything
            </Link>
          </div>
        ) : (
          <div className="text-muted">
            <Link href={`/all?minScore=${minMatch}`} className="text-accent hover:underline">
              Only show {minMatch}+ match
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <div>
          <JobList jobs={visible} />
          {hasMore && (
            <Link
              href={moreLink()}
              className="block text-center text-sm text-accent hover:underline mt-4"
            >
              Show more ({freshTotal - fresh.length} more new roles)
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <h2 className="text-sm font-medium text-text mb-3">Review queue</h2>
            {readyToReview.length === 0 ? (
              <p className="text-xs text-muted">No kits waiting on you right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {readyToReview.slice(0, 3).map((job) => (
                  <li key={job.id}>
                    <Link href={`/kit-studio?job=${job.id}`} className="text-sm text-text hover:text-accent block truncate">
                      {job.title} <span className="text-muted">· {job.company}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text">Targeting</h2>
              <Link href="/settings" className="text-xs text-accent hover:underline">
                Edit
              </Link>
            </div>
            <dl className="flex flex-col gap-2 text-xs">
              <SnapshotRow label="Titles" values={profile.target_titles} />
              <SnapshotRow label="Locations" values={profile.locations} />
              <SnapshotRow label="Must-haves" values={profile.must_haves} />
              <div>
                <dt className="text-muted mb-0.5">Min match</dt>
                <dd className="text-text">{minMatch}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3">
      <p className="text-2xl font-display font-bold grad-text tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function SnapshotRow({ label, values }: { label: string; values: string[] | null }) {
  return (
    <div>
      <dt className="text-muted mb-0.5">{label}</dt>
      <dd className="text-text">{values && values.length > 0 ? values.join(', ') : 'Not set'}</dd>
    </div>
  );
}
