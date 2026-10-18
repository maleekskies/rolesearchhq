import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMatch, applyTeachingPenalty, type RecentRejection } from '@/lib/scan/score';
import { makeFingerprint } from '@/lib/scan/fingerprint';

export const maxDuration = 60;

const PAGE = 200;
const CONCURRENCY = 20;
const TOUCHED = ['saved', 'kit_ready', 'applied', 'interview', 'offer'];
const DISMISSED = ['ignored', 'rejected'];

// POST /api/jobs/rescore-all   body: { after?: string }
// Re-runs today's rules over what is already in your Inbox, a page at a time
// (the panel keeps calling until `done`), so it works on thousands of jobs
// instead of silently stopping at the first 1,000.
//
//  - First call only: hides duplicates. Jobs sharing a company+title are the
//    same job; one copy is kept (something you acted on, else something you
//    dismissed before, else the best scoring) and untouched extra copies are
//    set to 'ignored'. Ignored rows stay on file so reposts never come back.
//  - Every call: re-scores a page of jobs. Ones that now break a rule
//    (deal-breaker, language, on-site, region) move to 'rejected', which is
//    undoable. Anything applied / interviewing / offered is never touched.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const after: string | undefined = typeof body?.after === 'string' ? body.after : undefined;

  // ---- duplicates (first call only) ----
  let duplicates = 0;
  if (!after) {
    type Row = { id: string; title: string; company: string; status: string; match_score: number | null; first_seen_at: string };
    const rows: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company, status, match_score, first_seen_at')
        .eq('user_id', user.id)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows.push(...((data ?? []) as Row[]));
      if (!data || data.length < 1000) break;
    }

    const rank = (r: Row) => (TOUCHED.includes(r.status) ? 0 : DISMISSED.includes(r.status) ? 1 : 2);
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const fp = makeFingerprint(r.title, r.company);
      const g = groups.get(fp);
      if (g) g.push(r);
      else groups.set(fp, [r]);
    }

    const toHide: string[] = [];
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      g.sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (b.match_score ?? -1) - (a.match_score ?? -1) ||
          String(a.first_seen_at).localeCompare(String(b.first_seen_at))
      );
      for (const extra of g.slice(1)) if (extra.status === 'new') toHide.push(extra.id);
    }

    for (let i = 0; i < toHide.length; i += 100) {
      const ids = toHide.slice(i, i + 100);
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'ignored', reject_reason: 'duplicate', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', ids);
      if (!error) duplicates += ids.length;
    }
  }

  // ---- re-score one page ----
  const { data: profile } = await supabase
    .from('profile')
    .select('target_titles, must_haves, deal_breakers, locations, seniority, languages, location')
    .eq('id', user.id)
    .single();

  let pageQuery = supabase
    .from('jobs')
    .select('id, title, company, description, location, status')
    .eq('user_id', user.id)
    .in('status', ['new', 'saved', 'kit_ready']) // never touch things in motion or dismissed
    .order('id', { ascending: true })
    .limit(PAGE);
  if (after) pageQuery = pageQuery.gt('id', after);

  const { data: jobs, error: jobsError } = await pageQuery;
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ rescored: 0, excluded: 0, duplicates, done: true, next: null });
  }

  const { data: recentRejections } = await supabase
    .from('rejections')
    .select('reason, term, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const rejections: RecentRejection[] = recentRejections ?? [];

  let rescored = 0;
  let excluded = 0;

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    await Promise.all(
      jobs.slice(i, i + CONCURRENCY).map(async (j) => {
        const raw = computeMatch(
          j.title,
          j.description,
          profile?.target_titles ?? [],
          profile?.must_haves ?? [],
          profile?.deal_breakers ?? [],
          j.location,
          profile?.locations ?? [],
          profile?.seniority ?? null,
          { languages: profile?.languages ?? [], homeLocation: profile?.location ?? null }
        );
        const match = applyTeachingPenalty(raw, j.title, j.company, rejections);

        const update: Record<string, unknown> = {
          match_score: match.score,
          match_why: [match.why],
          fit_tags: match.fitTags,
          match_checks: match.checks,
          match_gaps: match.gapTags,
          domain_score: match.domainScore,
          skills_score: match.skillsScore,
          seniority_score: match.seniorityScore,
          location_score: match.locationScore,
          updated_at: new Date().toISOString(),
        };

        if (match.hardExcluded) {
          update.status = 'rejected';
          update.reject_reason = `auto: ${match.excludeReason ?? 'deal_breaker'} (rescore)`;
          excluded += 1;
        }

        const { error } = await supabase.from('jobs').update(update).eq('id', j.id).eq('user_id', user.id);
        if (!error) rescored += 1;
      })
    );
  }

  const last = jobs[jobs.length - 1].id;
  const done = jobs.length < PAGE;
  return NextResponse.json({ rescored, excluded, duplicates, done, next: done ? null : last });
}
