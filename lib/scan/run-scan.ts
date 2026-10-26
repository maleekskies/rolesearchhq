import type { SupabaseClient } from '@supabase/supabase-js';
import { getSharedSources, type NormalizedJob, type ScanSourceResult } from '@/lib/scan/sources';
import { computeMatch, isExcludedCompany, applyTeachingPenalty, type RecentRejection } from '@/lib/scan/score';
import { makeFingerprint, makeLegacyFingerprint } from '@/lib/scan/fingerprint';
import { hasJobCrm, readJobCrm, withJobCrm } from '@/lib/job-crm';

const MAX_JOBS_PER_SCAN = 100;
// Fourteen days catches listings that boards publish or refresh slowly while
// still keeping the map recent. Seven days was dropping a lot of still-open
// roles simply because the board had not touched the posting recently.
const MAX_LISTING_AGE_DAYS = 14;

function isWithinRecencyWindow(postedAt: string | null): boolean {
  if (!postedAt) return true; // can't verify age, don't drop it over a missing field
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return true; // unparseable date, same reasoning
  const ageMs = Date.now() - posted;
  return ageMs <= MAX_LISTING_AGE_DAYS * 24 * 60 * 60 * 1000;
}

type ScoredJob = NormalizedJob & {
  match_score: number;
  match_why: string;
  fit_tags: string[];
  gap_tags: string[];
  match_checks: string[];
  domain_score: number;
  skills_score: number;
  seniority_score: number;
  location_score: number;
};

export interface DropCounts {
  language: number;
  onsite: number;
  location: number;
  dealBreaker: number;
  lowScore: number;
  excludedCompany: number;
  tooOld: number;
  duplicate: number;
}

export interface DroppedExample {
  title: string;
  company: string;
  url: string;
  score?: number;
}

export type DroppedExamples = Partial<Record<keyof DropCounts, DroppedExample[]>>;

export interface ScanResult {
  found: number;
  inserted: number;
  updated: number;
  dropped?: DropCounts;
  sourceErrors: string[];
  dbErrors: string[];
  message?: string;
}

// The actual "Scan now" logic, extracted so both the manual button
// (session-authenticated) and the automated cron (service-role, no session)
// call the exact same path rather than maintaining two copies.
export async function runScanForUser(
  supabase: SupabaseClient,
  userId: string,
  // Pass the boards' results in when scanning many users, so they are fetched once.
  sharedSources?: ScanSourceResult[]
): Promise<ScanResult> {
  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select(
      'target_titles, exclude_companies, must_haves, deal_breakers, locations, seniority, min_match, languages, location'
    )
    .eq('id', userId)
    .single();

  // If a column is missing (e.g. the languages migration hasn't been run yet)
  // say so instead of pretending there are no target titles.
  if (profileError) {
    return {
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors: [],
      dbErrors: [`profile: ${profileError.message}`],
      message: 'Could not read your profile, scan skipped.',
    };
  }

  const targetTitles = profile?.target_titles ?? [];
  const excludeCompanies = profile?.exclude_companies ?? [];
  const mustHaves = profile?.must_haves ?? [];
  const dealBreakers = profile?.deal_breakers ?? [];
  const profileLocations = profile?.locations ?? [];
  const profileSeniority = profile?.seniority ?? null;
  const minMatch: number = profile?.min_match ?? 70;
  const matchOpts = {
    languages: profile?.languages?.length ? profile.languages : ['English'],
    homeLocation: profile?.location ?? null,
  };

  if (targetTitles.length === 0) {
    return {
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors: [],
      dbErrors: [],
      message: 'No target titles set, scan skipped.',
    };
  }

  // Auto-archive listings nobody touched in 30 days so the Inbox doesn't just
  // grow forever. This used to run as a database write on every Inbox visit;
  // it now runs here, once per scan. Only ever touches unreviewed 'new' jobs.
  const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('jobs')
    .update({ status: 'ignored', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'new')
    .lt('updated_at', staleCutoff);

  const { data: recentRejections } = await supabase
    .from('rejections')
    .select('reason, term, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  const rejections: RecentRejection[] = recentRejections ?? [];

  // Manual scans search with the user's first target title. The automated
  // cron passes a shared, generic source list instead so it can scan many
  // users from one set of board requests.
  const sourceResults = sharedSources ?? (await getSharedSources(undefined, targetTitles));
  const sourceErrors = sourceResults.filter((r) => r.error).map((r) => `${r.source}: ${r.error}`);
  const dbErrors: string[] = [];

  const dropped: DropCounts = {
    language: 0,
    onsite: 0,
    location: 0,
    dealBreaker: 0,
    lowScore: 0,
    excludedCompany: 0,
    tooOld: 0,
    duplicate: 0,
  };
  const droppedExamples: DroppedExamples = {};
  const recordDrop = (reason: keyof DropCounts, job: NormalizedJob, score?: number) => {
    const examples = droppedExamples[reason] ?? [];
    if (examples.length < 3) {
      examples.push({
        title: job.title,
        company: job.company,
        url: job.url,
        ...(typeof score === 'number' ? { score } : {}),
      });
      droppedExamples[reason] = examples;
    }
  };

  const scoredWithDupes: ScoredJob[] = [];
  for (const j of sourceResults.flatMap((r) => r.jobs)) {
    if (isExcludedCompany(j.company, excludeCompanies)) {
      dropped.excludedCompany += 1;
      recordDrop('excludedCompany', j);
      continue;
    }
    if (!isWithinRecencyWindow(j.posted_at)) {
      dropped.tooOld += 1;
      recordDrop('tooOld', j);
      continue;
    }

    const rawMatch = computeMatch(
      j.title,
      j.description,
      targetTitles,
      mustHaves,
      dealBreakers,
      j.location,
      profileLocations,
      profileSeniority,
      matchOpts
    );

    if (rawMatch.hardExcluded) {
      const reason: keyof DropCounts =
        rawMatch.excludeReason === 'language'
          ? 'language'
          : rawMatch.excludeReason === 'onsite'
            ? 'onsite'
            : rawMatch.excludeReason === 'location'
              ? 'location'
              : 'dealBreaker';
      dropped[reason] += 1;
      recordDrop(reason, j);
      continue;
    }

    const match = applyTeachingPenalty(rawMatch, j.title, j.company, rejections);
    if (match.score < minMatch) {
      dropped.lowScore += 1;
      recordDrop('lowScore', j, match.score);
      continue;
    }

    scoredWithDupes.push({
      ...j,
      match_score: match.score,
      match_why: match.why,
      fit_tags: match.fitTags,
      gap_tags: match.gapTags,
      match_checks: match.checks,
      domain_score: match.domainScore,
      skills_score: match.skillsScore,
      seniority_score: match.seniorityScore,
      location_score: match.locationScore,
    });
  }

  // Some boards occasionally list the same job twice (re-tagged categories,
  // pagination overlap). A single duplicate (source, source_id) pair inside
  // one multi-row insert fails the WHOLE batch under the unique constraint,
  // not just that row, so dedupe before anything else touches the DB.
  const seen = new Map<string, (typeof scoredWithDupes)[number]>();
  for (const j of scoredWithDupes) {
    const key = `${j.source}:${j.source_id}`;
    const existing = seen.get(key);
    if (!existing || j.match_score > existing.match_score) seen.set(key, j);
  }

  // Same job from two boards (or a repost) in this very scan: keep the best
  // scoring copy only.
  const byPrint = new Map<string, ScoredJob>();
  for (const j of Array.from(seen.values()).sort((x, y) => y.match_score - x.match_score)) {
    const fp = makeFingerprint(j.title, j.company);
    if (byPrint.has(fp)) {
      dropped.duplicate += 1;
      recordDrop('duplicate', j);
    } else {
      byPrint.set(fp, j);
    }
  }
  const scored = Array.from(byPrint.values()).slice(0, MAX_JOBS_PER_SCAN);

  if (scored.length === 0) {
    await supabase
      .from('profile')
      .update({
        last_scan: { at: new Date().toISOString(), inserted: 0, minMatch, dropped, droppedExamples },
      })
      .eq('id', userId);
    return {
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors,
      dbErrors,
      dropped,
      message: `No new jobs at or above your ${minMatch} cutoff this scan.`,
    };
  }

  // Lookups are chunked: putting thousands of ids in one request overflows the
  // URL limit, the lookup silently returns nothing, and every job then looks new.
  // Remember what this scan dropped so the Today screen can show it.
  const saveLastScan = async (inserted: number) => {
    await supabase
      .from('profile')
      .update({
        last_scan: { at: new Date().toISOString(), inserted, minMatch, dropped, droppedExamples },
      })
      .eq('id', userId);
  };

  const chunk = <T,>(arr: T[], n: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  const existing: { id: string; source: string; source_id: string; raw_json: unknown }[] = [];
  for (const ids of chunk(scored.map((j) => j.source_id), 100)) {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, source, source_id, raw_json')
      .eq('user_id', userId)
      .in('source_id', ids);
    if (error) {
      // Stop rather than insert blind and create duplicates.
      return { found: 0, inserted: 0, updated: 0, dropped, sourceErrors, dbErrors: [`lookup: ${error.message}`] };
    }
    existing.push(...(data ?? []));
  }

  // Every fingerprint already on file for this user, in ANY status.
  const wanted = Array.from(
    new Set(scored.flatMap((j) => [makeFingerprint(j.title, j.company), makeLegacyFingerprint(j.title, j.company)]))
  );
  const knownPrints = new Set<string>();
  for (const prints of chunk(wanted, 80)) {
    const { data, error } = await supabase
      .from('jobs')
      .select('fingerprint')
      .eq('user_id', userId)
      .in('fingerprint', prints);
    if (error) {
      return { found: 0, inserted: 0, updated: 0, dropped, sourceErrors, dbErrors: [`lookup: ${error.message}`] };
    }
    for (const row of data ?? []) if (row.fingerprint) knownPrints.add(row.fingerprint);
  }

  const existingKey = new Set(existing.map((e) => `${e.source}:${e.source_id}`));
  const existingIdByKey = new Map(existing.map((e) => [`${e.source}:${e.source_id}`, e.id]));
  const existingRawById = new Map(existing.map((e) => [e.id, e.raw_json]));

  const toUpdate = scored.filter((j) => existingKey.has(`${j.source}:${j.source_id}`));
  const toInsert = scored.filter((j) => {
    if (existingKey.has(`${j.source}:${j.source_id}`)) return false;
    const seenBefore =
      knownPrints.has(makeFingerprint(j.title, j.company)) ||
      knownPrints.has(makeLegacyFingerprint(j.title, j.company));
    if (seenBefore) {
      dropped.duplicate += 1;
      recordDrop('duplicate', j);
    }
    return !seenBefore;
  });

  let inserted = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const rows = toInsert.map((j) => ({
      user_id: userId,
      source: j.source,
      source_id: j.source_id,
      title: j.title,
      company: j.company,
      location: j.location,
      url: j.url,
      description: j.description,
      raw_json: j.raw_json,
      posted_at: j.posted_at,
      match_score: j.match_score,
      match_why: [j.match_why],
      fit_tags: j.fit_tags,
      match_checks: j.match_checks,
      match_gaps: j.gap_tags,
      domain_score: j.domain_score,
      skills_score: j.skills_score,
      seniority_score: j.seniority_score,
      location_score: j.location_score,
      fingerprint: makeFingerprint(j.title, j.company),
      status: 'new' as const,
    }));
    const { data, error } = await supabase.from('jobs').insert(rows).select('id');
    if (!error) inserted = data?.length ?? 0;
    else dbErrors.push(`insert: ${error.message}`);
  }

  if (toUpdate.length > 0) {
    // Status is deliberately never included here. Updates refresh the
    // listing's details and score only; existing pipeline progress is untouched.
    const updates = await Promise.allSettled(
      toUpdate.map(async (j) => {
        const id = existingIdByKey.get(`${j.source}:${j.source_id}`);
        // The board refresh must not erase application details the user added
        // to raw_json. Carry the CRM object across if one exists.
        const existingCrm = readJobCrm(id ? existingRawById.get(id) : null);
        const rawJson = hasJobCrm(existingCrm) ? withJobCrm(j.raw_json, existingCrm) : j.raw_json;
        const { error } = await supabase
          .from('jobs')
          .update({
            title: j.title,
            company: j.company,
            location: j.location,
            url: j.url,
            description: j.description,
            raw_json: rawJson,
            posted_at: j.posted_at,
            match_score: j.match_score,
            match_why: [j.match_why],
            fit_tags: j.fit_tags,
            match_checks: j.match_checks,
            match_gaps: j.gap_tags,
            domain_score: j.domain_score,
            skills_score: j.skills_score,
            seniority_score: j.seniority_score,
            location_score: j.location_score,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw new Error(error.message);
      })
    );
    updated = updates.filter((r) => r.status === 'fulfilled').length;
    const failedUpdates = updates.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );
    if (failedUpdates.length > 0) {
      dbErrors.push(`${failedUpdates.length} update(s) failed: ${failedUpdates[0].reason}`);
    }
  }

  await saveLastScan(inserted);
  return { found: scored.length, inserted, updated, dropped, sourceErrors, dbErrors };
}
