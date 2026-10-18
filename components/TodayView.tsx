'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Info } from 'lucide-react';
import ScanButton from '@/components/ScanButton';

export interface TodayJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  score: number;
  checks: string[];
  gaps: string[];
  excerpt: string;
  postedAt: string | null;
}
export interface FollowUp {
  id: string;
  title: string;
  company: string;
  next_date: string;
  next_action: string | null;
}
export interface LastScan {
  at: string;
  inserted: number;
  minMatch: number;
  dropped: Record<string, number>;
}

type Mark = 'Saved' | 'Skipped';

const REASONS = [
  ['wrong seniority', 'Wrong seniority'],
  ['wrong domain', 'Not interested in the company'],
  ['needs a language I do not speak', "Needs a language I don't speak"],
  ['on-site or hybrid', 'On-site or hybrid'],
  ['too thin', 'Too thin'],
] as const;

const DROP_ROWS: Array<[string, string]> = [
  ['language', 'Needs another language'],
  ['onsite', 'On-site or hybrid'],
  ['location', 'Region-locked or needs eligibility'],
  ['duplicate', 'Already seen'],
  ['dealBreaker', 'Your deal-breakers'],
  ['lowScore', 'Below your cutoff'],
];

function ago(iso: string | null): string {
  if (!iso) return '';
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function Score({ value, big = false }: { value: number; big?: boolean }) {
  const strong = value >= 85;
  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-xl font-bold tabular-nums ${
        big ? 'w-14 h-14 text-xl' : 'w-11 h-11'
      } ${strong ? 'bg-accent text-accentInk' : 'bg-tint text-accent'}`}
    >
      {value}
    </div>
  );
}

export default function TodayView({
  jobs,
  reviewedToday,
  goal,
  extra,
  waiting,
  minMatch,
  followUps,
  lastScan,
}: {
  jobs: TodayJob[];
  reviewedToday: number;
  goal: number;
  extra: number;
  waiting: number;
  minMatch: number;
  followUps: FollowUp[];
  lastScan: LastScan | null;
}) {
  const [sel, setSel] = useState(0);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [error, setError] = useState<string | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const reviewedNow = Object.keys(marks).length;
  const reviewed = reviewedToday + reviewedNow;
  const total = reviewedToday + jobs.length;
  const finished = jobs.length === 0 || reviewedNow >= jobs.length;
  const job = jobs[sel];

  const nextOpen = (from: number, m: Record<string, Mark>) => {
    for (let i = 1; i <= jobs.length; i++) {
      const k = (from + i) % jobs.length;
      if (!m[jobs[k].id]) return k;
    }
    return from;
  };

  async function act(action: 'save' | 'skip' | 'reject', reason?: string) {
    if (!job || marks[job.id]) return;
    const id = job.id;
    const mark: Mark = action === 'save' ? 'Saved' : 'Skipped';
    const next = { ...marks, [id]: mark };
    setMarks(next); // instant: the request runs in the background
    setShowWhy(false);
    setError(null);
    setSel(nextOpen(sel, next));
    try {
      const res = await fetch(`/api/jobs/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`);
    } catch (err) {
      setMarks((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
      setError(`Couldn't save that one (${err instanceof Error ? err.message : 'network error'}). It is back in your list.`);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (!jobs.length) return;
      if (k === 'j' || k === 'arrowdown') setSel((s) => (s + 1) % jobs.length);
      else if (k === 'k' || k === 'arrowup') setSel((s) => (s + jobs.length - 1) % jobs.length);
      else if (k === 's') act('save');
      else if (k === 'x') act('skip');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const droppedTotal = useMemo(() => {
    if (!lastScan) return 0;
    return DROP_ROWS.filter(([k]) => k !== 'lowScore').reduce((n, [k]) => n + (lastScan.dropped?.[k] ?? 0), 0);
  }, [lastScan]);

  const maxDrop = Math.max(1, ...DROP_ROWS.map(([k]) => lastScan?.dropped?.[k] ?? 0));

  return (
    <div className="px-4 sm:px-8 py-8 pb-52 md:pb-10 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Today</h1>
          <p className="text-muted mt-1.5 max-w-xl">
            {total > 0
              ? `${total} strong match${total === 1 ? '' : 'es'}, picked from everything the boards listed. Nothing here needs a language you don't speak or an office you can't sit in.`
              : 'Your strongest matches show up here after a scan.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {lastScan && (
            <button
              type="button"
              onClick={() => setShowDrop((v) => !v)}
              aria-expanded={showDrop}
              className="bg-surface border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-text hover:bg-surfaceHover"
            >
              What was dropped? <b>{droppedTotal}</b>
            </button>
          )}
          <ScanButton />
        </div>
      </div>

      {showDrop && lastScan && (
        <section className="bg-surface border border-border rounded-xl p-4 mb-4" aria-label="What was dropped">
          <p className="text-sm font-medium text-text mb-1">Dropped for you in your last scan</p>
          <p className="text-xs text-muted mb-3">These never reach your list, so you can trust what you do see.</p>
          {DROP_ROWS.map(([key, label]) => {
            const n = lastScan.dropped?.[key] ?? 0;
            return (
              <div key={key} className="grid grid-cols-[170px_1fr_36px] sm:grid-cols-[230px_1fr_40px] items-center gap-3 text-sm mt-2">
                <span className="text-muted">{label}</span>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(n / maxDrop) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums text-text">{n}</span>
              </div>
            );
          })}
        </section>
      )}

      {followUps.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-warnBg border border-warnLine text-warnInk rounded-xl px-4 py-3 mb-4 text-sm">
          <span>
            <b>
              {followUps.length} follow-up{followUps.length === 1 ? '' : 's'} due.
            </b>{' '}
            {followUps[0].title} at {followUps[0].company}
            {followUps.length > 1 ? ` and ${followUps.length - 1} more` : ''}.
          </span>
          <Link href="/pipeline" className="font-semibold underline shrink-0">
            Open pipeline
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="bg-danger/10 border border-danger/30 text-danger rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </p>
      )}

      {jobs.length === 0 && reviewedToday === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-text mb-2">Nothing at {minMatch}+ yet</h2>
          <p className="text-muted max-w-md mx-auto mb-4">
            Run a scan and anything strong shows up here. You can also lower your cutoff in Settings, or browse everything.
          </p>
          <Link href="/all?minScore=0" className="text-accent font-medium underline">
            Browse all matches
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[370px_1fr] gap-5">
          <section className="bg-surface border border-border rounded-2xl p-3.5 self-start" aria-label="Queue">
            <button
              type="button"
              onClick={() => setShowQueue((v) => !v)}
              className="w-full flex justify-between text-sm text-muted mx-1 mb-2 lg:cursor-default lg:pointer-events-none"
              style={{ width: 'calc(100% - 8px)' }}
            >
              <b className="text-text underline lg:no-underline">
                {reviewed} of {total} reviewed
              </b>
              <span>{Math.max(0, total - reviewed)} left</span>
            </button>
            <div className="h-1.5 bg-border rounded-full mx-1 mb-3 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${total ? (reviewed / total) * 100 : 0}%` }}
              />
            </div>
            <div className={`${showQueue ? 'block' : 'hidden'} lg:block`}>
              {jobs.map((j, i) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => {
                    setSel(i);
                    setShowQueue(false);
                  }}
                  aria-current={i === sel && !finished}
                  className={`w-full flex items-center gap-3 text-left p-2.5 rounded-xl mt-1 ${
                    i === sel && !finished ? 'bg-tint ring-2 ring-accent' : 'hover:bg-surfaceHover'
                  } ${marks[j.id] ? 'opacity-55' : ''}`}
                >
                  <Score value={j.score} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-text truncate">{j.title}</div>
                    <div className="text-xs text-muted truncate">{j.company}</div>
                  </div>
                  <span className="text-xs text-muted">{marks[j.id] ?? ''}</span>
                </button>
              ))}
            </div>
          </section>

          <article className="bg-surface border border-border rounded-2xl p-5 sm:p-7 flex flex-col min-h-[460px]" aria-live="polite">
            {finished || !job ? (
              <div className="m-auto text-center max-w-sm">
                <h2 className="font-display text-2xl font-bold text-text mb-2">That&apos;s today&apos;s {reviewed}.</h2>
                <p className="text-muted mb-5">
                  {waiting > 0
                    ? `${waiting} more strong match${waiting === 1 ? ' is' : 'es are'} waiting. They stay put until you want them.`
                    : 'New matches arrive after the next scan, so there is nothing left to scroll.'}
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {waiting > 0 && (
                    <Link
                      href={`/?extra=${extra + 10}`}
                      className="bg-accent text-accentInk font-semibold rounded-lg px-4 py-2.5 text-sm"
                    >
                      Review 10 more
                    </Link>
                  )}
                  <Link href="/pipeline" className="bg-surface border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-text">
                    Open pipeline
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-bold text-text leading-tight">{job.title}</h2>
                    <p className="text-muted mt-1">
                      {[job.company, job.location, ago(job.postedAt)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <Score value={job.score} big />
                    <div className="text-xs text-muted mt-1">{job.score >= 85 ? 'Strong' : 'Good'} match</div>
                  </div>
                </div>

                <h3 className="text-xs uppercase tracking-wider text-muted mt-6 mb-2.5">Why it&apos;s here</h3>
                <ul className="flex flex-col gap-2">
                  {job.checks.map((c) => (
                    <li key={c} className="flex gap-2.5 text-text">
                      <Check size={16} className="text-accent shrink-0 mt-1" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>

                {job.gaps.length > 0 && (
                  <>
                    <h3 className="text-xs uppercase tracking-wider text-muted mt-5 mb-2.5">Worth a look</h3>
                    <ul className="flex flex-col gap-2">
                      {job.gaps.map((g) => (
                        <li key={g} className="flex gap-2.5 text-text">
                          <Info size={16} className="text-warnInk shrink-0 mt-1" aria-hidden />
                          {`Doesn't mention ${g}`}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {job.excerpt && (
                  <p className="text-muted leading-relaxed mt-5 max-w-2xl">
                    {job.excerpt}
                    {job.excerpt.length >= 480 ? '…' : ''}
                  </p>
                )}

                {showWhy && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {REASONS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => act('reject', value)}
                        className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text hover:bg-surfaceHover"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="fixed md:static inset-x-0 bottom-[88px] md:bottom-auto z-10 md:mt-auto md:pt-6 bg-surface border-t md:border-0 border-border px-4 py-3 md:p-0 md:pt-6 flex gap-2.5 items-center flex-wrap">
                  <button
                    type="button"
                    onClick={() => act('save')}
                    className="flex-[2] md:flex-none min-h-[48px] md:min-h-0 bg-accent text-accentInk font-semibold rounded-lg px-5 py-3"
                  >
                    Save to pipeline
                    <kbd className="hidden md:inline ml-2 border border-current rounded px-1.5 text-xs opacity-70">S</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => act('skip')}
                    className="flex-1 md:flex-none min-h-[48px] md:min-h-0 bg-surface border border-border text-text rounded-lg px-5 py-3 font-medium"
                  >
                    Skip
                    <kbd className="hidden md:inline ml-2 border border-current rounded px-1.5 text-xs opacity-70">X</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWhy((v) => !v)}
                    className="hidden md:block text-muted underline px-2 py-3"
                  >
                    Not for me, because...
                  </button>
                  <div className="hidden md:flex ml-auto gap-4 items-center">
                    <Link href={`/jobs/${job.id}`} className="text-muted underline text-sm">
                      Full details
                    </Link>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-accent font-semibold">
                        Open posting
                      </a>
                    )}
                  </div>
                </div>
                <div className="md:hidden flex justify-between mt-5 text-sm">
                  <button type="button" onClick={() => setShowWhy((v) => !v)} className="text-muted underline">
                    Not for me, because...
                  </button>
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-accent font-semibold">
                      Open posting
                    </a>
                  )}
                </div>
              </>
            )}
          </article>
        </div>
      )}

      <p className="hidden md:block text-xs text-muted mt-4 mx-1">
        J / K to move, S to save, X to skip.{' '}
        <Link href="/all" className="underline">
          Browse all matches
        </Link>{' '}
        to search, sort, paste a link or add a job.
      </p>
    </div>
  );
}
