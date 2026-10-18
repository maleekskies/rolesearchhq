import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import TodayView, { type TodayJob, type FollowUp, type LastScan } from '@/components/TodayView';

export const metadata: Metadata = { title: 'Today' };
export const dynamic = 'force-dynamic';

const DAILY_GOAL = 10;
const COLUMNS =
  'id, title, company, location, url, description, match_score, match_why, match_gaps, match_checks, posted_at, first_seen_at';

// Today: a short, finite list of your strongest unreviewed matches. How many
// you review a day is capped (10, or more if you ask), so there is an end to it.
// The full searchable list lives at /all.
export default async function TodayPage({ searchParams }: { searchParams: { extra?: string } }) {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect('/login');

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const today = new Date().toISOString().slice(0, 10);
  const extra = Math.min(100, Math.max(0, Number(searchParams.extra) || 0));
  const goal = DAILY_GOAL + extra;

  // Everything that only needs your id runs at the same time.
  const [profileRes, reviewedRes, followRes] = await Promise.all([
    supabase.from('profile').select('onboarded_at, min_match, last_scan').eq('id', userId).maybeSingle(),
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('reviewed_at', startOfDay.toISOString()),
    supabase
      .from('jobs')
      .select('id, title, company, next_date, next_action')
      .eq('user_id', userId)
      .eq('status', 'applied')
      .not('next_date', 'is', null)
      .lte('next_date', today)
      .order('next_date', { ascending: true })
      .limit(3),
  ]);

  const profile = profileRes.data;
  if (!profile?.onboarded_at) redirect('/onboarding');
  const minMatch: number = profile.min_match ?? 70;

  const freshBase = () =>
    supabase
      .from('jobs')
      .select(COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'new')
      .gte('match_score', minMatch);

  const reviewedToday = reviewedRes.count ?? 0;
  const slots = Math.max(0, goal - reviewedToday);

  const queueRes = slots
    ? await freshBase()
        .order('match_score', { ascending: false, nullsFirst: false })
        .order('first_seen_at', { ascending: false })
        .limit(slots)
    : { data: [], count: (await freshBase().limit(1)).count ?? 0 };

  const jobs: TodayJob[] = (queueRes.data ?? []).map((j: any) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    url: j.url,
    score: j.match_score ?? 0,
    checks: j.match_checks?.length ? j.match_checks : j.match_why ?? [],
    gaps: j.match_gaps ?? [],
    // Only a short excerpt is sent to the browser, not the whole description.
    excerpt: (j.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 480),
    postedAt: j.posted_at ?? j.first_seen_at,
  }));

  const waiting = Math.max(0, (queueRes.count ?? 0) - jobs.length);

  return (
    <TodayView
      jobs={jobs}
      reviewedToday={reviewedToday}
      goal={goal}
      extra={extra}
      waiting={waiting}
      minMatch={minMatch}
      followUps={(followRes.data ?? []) as FollowUp[]}
      lastScan={(profile.last_scan ?? null) as LastScan | null}
    />
  );
}
