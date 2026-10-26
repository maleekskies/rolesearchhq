// Some boards ask API clients to identify themselves. The contact address comes
// from the environment so it isn't hard-coded in a public repo.
const USER_AGENT = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  ? `RoleSearchHQ job scanner (contact: ${process.env.NEXT_PUBLIC_CONTACT_EMAIL})`
  : 'RoleSearchHQ job scanner';

// Fetchers for the free, no-key job board APIs from the handoff doc.
// Each one is wrapped so a single source failing (timeout, schema change,
// rate limit) never takes down the whole scan, callers get partial results
// plus a per-source error list.

export interface NormalizedJob {
  source: string;
  source_id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  description: string | null;
  raw_json: unknown;
  posted_at: string | null;
}

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function unixSecondsToIso(value: unknown): string | null {
  const seconds = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function himalayasLocation(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'Remote';
  const names = value
    .map((part) => (typeof part === 'string' ? part : (part as { name?: string } | null)?.name))
    .filter((name): name is string => Boolean(name));
  return names.length ? `Remote - ${names.join(', ')}` : 'Remote';
}

// --- RemoteOK ---------------------------------------------------------
// Requires a real User-Agent or it blocks the request. First array item is
// a legal notice, not a job, skip anything without an `id`.
async function fetchRemoteOK(): Promise<NormalizedJob[]> {
  const res = await fetchWithTimeout('https://remoteok.com/api', {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`RemoteOK ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('RemoteOK: unexpected shape');

  return data
    .filter((item: any) => item && item.id && (item.position || item.title))
    .map((item: any): NormalizedJob => ({
      source: 'remoteok',
      source_id: String(item.id),
      title: item.position ?? item.title,
      company: item.company ?? 'Unknown',
      location: item.location ? `Remote - ${item.location}` : 'Remote',
      url: item.url || item.apply_url || `https://remoteok.com/remote-jobs/${item.id}`,
      description: stripHtml(item.description),
      raw_json: item,
      posted_at: item.date ?? null,
    }));
}

// A target title like "Technical Writer (Web3 / crypto)" is too noisy for a
// board search box. Use the readable title before parentheses or slash
// alternatives. The full title still drives scoring later.
function primaryTargetQuery(query?: string | null): string {
  return (query ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .split('/')[0]
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Remotive -----------------------------------------------------------
async function fetchRemotive(query?: string): Promise<NormalizedJob[]> {
  const search = primaryTargetQuery(query);
  const url = `https://remotive.com/api/remote-jobs?limit=100${
    search ? `&search=${encodeURIComponent(search)}` : ''
  }`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const data = await res.json();
  const jobs = data.jobs;
  if (!Array.isArray(jobs)) throw new Error('Remotive: unexpected shape');

  return jobs.map((item: any): NormalizedJob => ({
    source: 'remotive',
    source_id: String(item.id),
    title: item.title,
    company: item.company_name ?? 'Unknown',
    location: item.candidate_required_location ? `Remote - ${item.candidate_required_location}` : 'Remote',
    url: item.url,
    description: stripHtml(item.description),
    raw_json: item,
    posted_at: item.publication_date ?? null,
  }));
}

// --- Himalayas ------------------------------------------------------------
// Field names aren't fully pinned down publicly, so map defensively with
// fallbacks rather than assuming one exact schema. The search endpoint is
// limited to 20 results, but those are relevant to the target title.
async function fetchHimalayas(query?: string): Promise<NormalizedJob[]> {
  const search = primaryTargetQuery(query);
  const url = search
    ? `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(search)}&limit=20`
    : 'https://himalayas.app/jobs/api?limit=100';
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Himalayas ${res.status}`);
  const data = await res.json();
  const jobs = Array.isArray(data) ? data : data.jobs;
  if (!Array.isArray(jobs)) throw new Error('Himalayas: unexpected shape');

  return jobs
    .map((item: any): NormalizedJob | null => {
      const id = item.guid ?? item.id ?? item.slug;
      const title = item.title ?? item.jobTitle ?? item.position;
      const url = item.applicationLink ?? item.url ?? item.link;
      if (!id || !title || !url) return null;
      return {
        source: 'himalayas',
        source_id: String(id),
        title,
        company: item.companyName ?? item.company?.name ?? 'Unknown',
        location: item.locationRestrictions?.length ? `Remote - ${item.locationRestrictions.join(', ')}` : 'Remote',
        url,
        description: stripHtml(item.description ?? item.excerpt),
        raw_json: item,
        posted_at: item.pubDate ?? item.publishedAt ?? null,
      };
    })
    .filter((j): j is NormalizedJob => j !== null);
}

// --- Arbeitnow -------------------------------------------------------------
async function fetchArbeitnow(): Promise<NormalizedJob[]> {
  const res = await fetchWithTimeout('https://www.arbeitnow.com/api/job-board-api');
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
  const data = await res.json();
  const jobs = data.data;
  if (!Array.isArray(jobs)) throw new Error('Arbeitnow: unexpected shape');

  return jobs.map((item: any): NormalizedJob => ({
    source: 'arbeitnow',
    source_id: String(item.slug),
    title: item.title,
    company: item.company_name ?? 'Unknown',
    location: item.remote ? 'Remote' : (item.location || 'Unspecified'),
    url: item.url,
    description: stripHtml(item.description),
    raw_json: item,
    posted_at: item.created_at ? new Date(item.created_at * 1000).toISOString() : null,
  }));
}

// --- Jobicy ---------------------------------------------------------------
async function fetchJobicy(query?: string): Promise<NormalizedJob[]> {
  // Jobicy accepts a 3-50 character `tag` keyword query.
  const tag = primaryTargetQuery(query).slice(0, 50);
  const url = `https://jobicy.com/api/v2/remote-jobs?count=100${
    tag.length >= 3 ? `&tag=${encodeURIComponent(tag)}` : ''
  }`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Jobicy ${res.status}`);
  const data = await res.json();
  const jobs = data.jobs;
  if (!Array.isArray(jobs)) throw new Error('Jobicy: unexpected shape');

  return jobs.map((item: any): NormalizedJob => ({
    source: 'jobicy',
    source_id: String(item.id),
    title: item.jobTitle,
    company: item.companyName ?? 'Unknown',
    location: item.jobGeo ? `Remote - ${item.jobGeo}` : 'Remote',
    url: item.url,
    description: stripHtml(item.jobDescription ?? item.jobExcerpt),
    raw_json: item,
    posted_at: item.pubDate ?? null,
  }));
}

// --- Adzuna ---------------------------------------------------------------
// Aggregates Indeed, Glassdoor, Workday, and 30+ other sources, the closest
// legitimate free equivalent to searching Indeed directly. Free tier is
// ~1,000 calls/month (~33/day), so this fetches exactly ONE page per scan
// (50 results) rather than paginating, and skips cleanly if no key is set.
// Country defaults to 'us' since that's where most remote-friendly listings
// concentrate on Adzuna; it doesn't cover every market (no Nigeria feed).
// A manual scan passes the first target title as `what` so the page is about
// the work the user actually wants. The daily cron keeps the broad page so it
// can share one response across every user in the batch.
async function fetchAdzuna(query?: string): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error('Adzuna not configured (ADZUNA_APP_ID / ADZUNA_APP_KEY missing) - skipped');
  }

  const country = 'us';
  const search = primaryTargetQuery(query);
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '50',
    'content-type': 'application/json',
  });
  if (search) params.set('what', search);
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Adzuna ${res.status}`);
  const data = await res.json();
  const jobs = data.results;
  if (!Array.isArray(jobs)) throw new Error('Adzuna: unexpected shape');

  return jobs
    .map((item: any): NormalizedJob | null => {
      if (!item.id || !item.title || !item.redirect_url) return null;
      return {
        source: 'adzuna',
        source_id: String(item.id),
        title: item.title,
        company: item.company?.display_name ?? 'Unknown',
        location: item.location?.display_name || 'Unspecified',
        url: item.redirect_url,
        description: stripHtml(item.description),
        raw_json: item,
        posted_at: item.created ?? null,
      };
    })
    .filter((j): j is NormalizedJob => j !== null);
}

export interface ScanSourceResult {
  source: string;
  jobs: NormalizedJob[];
  error: string | null;
}

// Runs every source in parallel; one failing never blocks the others.
// Passing target titles makes the search-based boards (Remotive, Himalayas,
// Jobicy and Adzuna) ask for that work instead of a generic feed.
export async function scanAllSources(targetTitles: string[] = []): Promise<ScanSourceResult[]> {
  const primaryTitle = targetTitles[0];
  const sources: { name: string; fn: () => Promise<NormalizedJob[]> }[] = [
    { name: 'remoteok', fn: fetchRemoteOK },
    { name: 'remotive', fn: () => fetchRemotive(primaryTitle) },
    { name: 'himalayas', fn: () => fetchHimalayas(primaryTitle) },
    { name: 'arbeitnow', fn: fetchArbeitnow },
    { name: 'jobicy', fn: () => fetchJobicy(primaryTitle) },
    { name: 'adzuna', fn: () => fetchAdzuna(primaryTitle) },
  ];

  const results = await Promise.allSettled(sources.map((s) => s.fn()));

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { source: sources[i].name, jobs: result.value, error: null };
    }
    return { source: sources[i].name, jobs: [], error: String(result.reason) };
  });
}

// The boards return the same listings no matter who is asking, so a scan for
// many users should download them once, not once per user. Warm serverless
// instances also reuse the result for a few minutes, which keeps repeated
// "Scan now" presses from hammering the boards or the Adzuna quota.
// Targeted manual scans get their own cache entry because their query differs
// from the shared cron scan.
const SHARED_TTL_MS = 10 * 60 * 1000;
let sharedCache: { at: number; key: string; results: ScanSourceResult[] } | null = null;

export async function getSharedSources(
  maxAgeMs: number = SHARED_TTL_MS,
  targetTitles: string[] = []
): Promise<ScanSourceResult[]> {
  const key = primaryTargetQuery(targetTitles[0]) || '';
  if (sharedCache && sharedCache.key === key && Date.now() - sharedCache.at < maxAgeMs) {
    return sharedCache.results;
  }
  const results = await scanAllSources(targetTitles);
  // Don't cache a run where every source failed.
  if (results.some((r) => r.jobs.length > 0)) sharedCache = { at: Date.now(), key, results };
  return results;
}
