'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronDown, Info, X } from 'lucide-react';
import ScanButton from '@/components/ScanButton';
import ContourField from '@/components/ContourField';
import { contourPath, mixHex } from '@/lib/contour';

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
  kitStatus?: string | null;
}
export interface FollowUp {
  id: string;
  title: string;
  company: string;
  next_date: string;
  next_action: string | null;
}
export interface DroppedExample {
  title: string;
  company: string;
  url: string;
  score?: number;
}

export interface LastScan {
  at: string;
  inserted: number;
  minMatch: number;
  dropped: Record<string, number>;
  droppedExamples?: Record<string, DroppedExample[]>;
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
  ['location', 'Region or eligibility'],
  ['duplicate', 'Already seen'],
  ['dealBreaker', 'Your deal-breakers'],
  ['excludedCompany', 'Excluded company'],
  ['tooOld', 'Too old'],
  ['lowScore', 'Below your cutoff'],
];

// Hand-placed clearings on the 1000 × 560 map. The strongest match gets the
// calm centre; later matches fan out around it.
const MAP_POSITIONS = [
  { x: 630, y: 205 },
  { x: 355, y: 315 },
  { x: 760, y: 380 },
  { x: 205, y: 170 },
  { x: 520, y: 440 },
  { x: 805, y: 155 },
  { x: 425, y: 85 },
  { x: 700, y: 455 },
  { x: 180, y: 390 },
  { x: 815, y: 290 },
  { x: 285, y: 480 },
  { x: 550, y: 300 },
  { x: 745, y: 265 },
  { x: 470, y: 390 },
];

const AMBIENT_CONTOURS = [
  { x: 790, y: 220, rings: 7, phase: 0.2 },
  { x: 240, y: 530, rings: 6, phase: 1.4 },
  { x: 540, y: 660, rings: 5, phase: 2.8 },
];

function ago(iso: string | null): string {
  if (!iso) return '';
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function scoreTag(score: number): string {
  if (score >= 85) return 'Strong fit';
  if (score >= 75) return 'Good fit';
  return 'Fair fit';
}

function kitLabel(status: string | null | undefined): string {
  if (status === 'approved') return 'Approved';
  if (status === 'needs_edit') return 'Needs edits';
  if (status === 'draft') return 'Draft ready';
  return 'Not started';
}

function TodayMap({
  jobs,
  selected,
  marks,
  onSelect,
  droppedTotal,
  lastScanAt,
}: {
  jobs: TodayJob[];
  selected: number;
  marks: Record<string, Mark>;
  onSelect: (index: number) => void;
  droppedTotal: number;
  lastScanAt: string | null;
}) {
  const dots = useMemo(() => {
    const count = Math.min(180, Math.max(0, droppedTotal));
    if (!count) return [];
    let seed = 1337 + (lastScanAt?.length ?? 0) + jobs.length * 17;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const peaks = jobs.map((_, index) => MAP_POSITIONS[index % MAP_POSITIONS.length]);
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let clear = false;
      for (let tries = 0; tries < 24; tries++) {
        x = 34 + random() * 932;
        y = 34 + random() * 492;
        clear = peaks.every((peak) => Math.hypot(peak.x - x, peak.y - y) > 58);
        if (clear) break;
      }
      if (clear) {
        out.push({ x, y, r: 1.1 + random() * 2.1, o: 0.2 + random() * 0.45 });
      }
    }
    return out;
  }, [droppedTotal, lastScanAt, jobs]);

  const showLabels = jobs.length <= 12;

  return (
    <svg
      viewBox="0 0 1000 560"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="group"
      aria-label="Map of today's strongest roles"
    >
      <g aria-hidden="true">
        {AMBIENT_CONTOURS.map((group, q) =>
          Array.from({ length: group.rings }, (_, index) => {
            const j = group.rings - 1 - index;
            const r = 28 + j * 32;
            const color = mixHex('#E0B45A', '#2F5A45', j / Math.max(1, group.rings - 1));
            return (
              <path
                key={`ambient-${q}-${j}`}
                d={contourPath(group.x, group.y, r, group.phase + q * 0.7, 96, 1.18)}
                fill="rgba(227,240,225,.018)"
                stroke={color}
                strokeWidth="1.1"
                opacity={0.8 - (j / group.rings) * 0.55}
              />
            );
          })
        )}
      </g>

      <g aria-hidden="true">
        {dots.map((dot, index) => (
          <circle
            key={`dot-${index}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill="#7CC4D6"
            opacity={dot.o}
          />
        ))}
      </g>

      <g transform="translate(34 38)" opacity="0.55" aria-hidden="true">
        <path d="M0 13 7 0 14 13Z" fill="none" stroke="#93B3A0" strokeWidth="1.2" strokeLinejoin="round" />
        <text x="20" y="11" fill="#93B3A0" fontSize="10" letterSpacing="2.2">
          N
        </text>
      </g>

      {jobs.map((job, index) => {
        const pos = MAP_POSITIONS[index % MAP_POSITIONS.length];
        const rings = job.score >= 88 ? 4 : job.score >= 78 ? 3 : 2;
        const outer = 20 + (rings - 1) * 11;
        const active = selected === index;
        const marked = Boolean(marks[job.id]);
        const label =
          job.company.length > 22 ? `${job.company.slice(0, 21).trimEnd()}…` : job.company;
        const labelWidth = Math.min(190, Math.max(76, label.length * 7.1 + 26));
        const labelX = Math.max(12, Math.min(988 - labelWidth, pos.x - labelWidth / 2));
        const below = pos.y + outer + 36 < 532;
        const labelY = below ? pos.y + outer + 20 : pos.y - outer - 42;

        return (
          <g key={job.id} opacity={marked ? 0.46 : 1}>
            <g
              className="peak"
              role="button"
              tabIndex={0}
              aria-label={`${job.title} at ${job.company}, fit ${job.score}`}
              aria-pressed={active}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(index);
                }
              }}
            >
              <circle
                className="halo"
                cx={pos.x}
                cy={pos.y}
                r={outer + 9}
                fill="none"
                stroke={active ? '#E0B45A' : 'transparent'}
                strokeOpacity={active ? 0.3 : 0}
                strokeWidth="6"
              />
              <circle cx={pos.x} cy={pos.y} r={outer + 4} fill="rgba(227,240,225,.018)" />
              {Array.from({ length: rings }, (_, ring) => {
                const r = 20 + ring * 11;
                const color = mixHex('#E0B45A', '#4F8266', ring / Math.max(1, rings - 1));
                return (
                  <path
                    key={`${job.id}-ring-${ring}`}
                    d={contourPath(pos.x, pos.y, r, 0.8 + index * 0.6 + ring * 0.25, 96, 1.08)}
                    fill="none"
                    stroke={marked ? '#5E7666' : color}
                    strokeWidth={active ? 1.5 : 1.2}
                    opacity={0.9 - ring * 0.12}
                  />
                );
              })}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={active ? 18 : 15.5}
                fill={active ? '#E0B45A' : marked ? '#163A30' : '#0E2A1F'}
                stroke={active ? '#E0B45A' : marked ? '#93B3A0' : '#C89A3F'}
                strokeWidth={active ? 2 : 1.4}
              />
              <text
                x={pos.x}
                y={pos.y + (active ? 5.5 : 4.8)}
                textAnchor="middle"
                className="font-display tabular-nums"
                fontSize={active ? 15 : 13}
                fontWeight="700"
                fill={active ? '#2A2008' : marked ? '#93B3A0' : '#E3F0E1'}
              >
                {job.score}
              </text>
            </g>

            {showLabels && (
              <g className="hidden sm:block" pointerEvents="none" aria-hidden="true">
                <rect
                  x={labelX}
                  y={labelY}
                  width={labelWidth}
                  height="24"
                  rx="12"
                  fill={active ? '#E0B45A' : '#0B2018'}
                  stroke={active ? 'none' : '#2D4A3B'}
                  strokeWidth="1"
                />
                <text
                  x={labelX + labelWidth / 2}
                  y={labelY + 16}
                  textAnchor="middle"
                  className="font-sans"
                  fontSize="12.5"
                  fontWeight="600"
                  fill={active ? '#2A2008' : '#CFE3D3'}
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DropSheet({
  lastScan,
  droppedTotal,
  maxDrop,
  minMatch,
  onClose,
}: {
  lastScan: LastScan;
  droppedTotal: number;
  maxDrop: number;
  minMatch: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drop-title"
        className="card-deep max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-[28px] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Last scan</p>
            <h2 id="drop-title" className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.025em] text-text">
              What we filtered out
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/10 hover:text-text"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          These never reached your map. You only see what cleared your filters and your{' '}
          {minMatch} cutoff — {droppedTotal} filtered this time. A few examples show what landed in each
          bucket, so you can spot a filter that is too tight.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {DROP_ROWS.map(([key, label]) => {
            const count = lastScan.dropped?.[key] ?? 0;
            const examples = lastScan.droppedExamples?.[key] ?? [];
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between gap-4 text-[13.5px]">
                  <span className="text-muted">{label}</span>
                  <span className="tabular-nums font-semibold text-text">{count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (count / maxDrop) * 100)}%` }}
                  />
                </div>
                {examples.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5 border-l border-border pl-3">
                    {examples.map((example, index) => (
                      <li
                        key={`${key}-example-${index}`}
                        className="flex items-start justify-between gap-3 text-[11.5px] leading-snug"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-text/80">{example.title}</span>
                          <span className="block truncate text-muted/75">
                            {example.company}
                            {typeof example.score === 'number' ? ` · ${example.score} match` : ''}
                          </span>
                        </span>
                        <a
                          href={example.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-semibold text-water hover:text-text"
                        >
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
          <Link href="/settings" onClick={onClose} className="font-semibold text-accent hover:underline">
            Adjust filters in Settings
          </Link>
          <span className="text-muted/40">·</span>
          <Link href="/all?minScore=0" onClick={onClose} className="font-semibold text-water hover:underline">
            Browse every match
          </Link>
        </div>

        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm mt-4 w-full">
          Back to the map
        </button>
      </div>
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
  const [scanLabel, setScanLabel] = useState(
    lastScan?.at
      ? new Date(lastScan.at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })
      : 'not yet'
  );

  useEffect(() => {
    if (!lastScan?.at) {
      setScanLabel('not yet');
      return;
    }
    setScanLabel(
      new Date(lastScan.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }, [lastScan?.at]);

  useEffect(() => {
    if (!showDrop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowDrop(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [showDrop]);

  const reviewedNow = Object.keys(marks).length;
  const reviewed = reviewedToday + reviewedNow;
  const total = reviewedToday + jobs.length;
  const finished = jobs.length === 0 || reviewedNow >= jobs.length;
  const job = jobs[sel];

  const droppedTotal = useMemo(() => {
    if (!lastScan) return 0;
    return Object.values(lastScan.dropped ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
  }, [lastScan]);

  const maxDrop = Math.max(1, ...DROP_ROWS.map(([key]) => lastScan?.dropped?.[key] ?? 0));

  const selectJob = useCallback((index: number) => {
    setSel(index);
    setShowWhy(false);
  }, []);

  const nextOpen = useCallback(
    (from: number, marked: Record<string, Mark>) => {
      for (let i = 1; i <= jobs.length; i++) {
        const candidate = (from + i) % jobs.length;
        if (!marked[jobs[candidate].id]) return candidate;
      }
      return from;
    },
    [jobs]
  );

  const act = useCallback(
    async (action: 'save' | 'skip' | 'reject', reason?: string) => {
      const current = jobs[sel];
      if (!current || marks[current.id]) return;
      const id = current.id;
      const mark: Mark = action === 'save' ? 'Saved' : 'Skipped';
      const next = { ...marks, [id]: mark };
      setMarks(next);
      setShowWhy(false);
      setError(null);
      setSel(nextOpen(sel, next));
      try {
        const response = await fetch(`/api/jobs/${id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reason }),
        });
        if (!response.ok) {
          throw new Error((await response.json().catch(() => ({}))).error ?? `Error ${response.status}`);
        }
      } catch (err) {
        setMarks((currentMarks) => {
          const copy = { ...currentMarks };
          delete copy[id];
          return copy;
        });
        setError(
          `Couldn't save that one (${err instanceof Error ? err.message : 'network error'}). It is back in your list.`
        );
      }
    },
    [jobs, sel, marks, nextOpen]
  );

  const move = useCallback(
    (direction: number) => {
      if (!jobs.length) return;
      let target = sel;
      for (let step = 1; step <= jobs.length; step++) {
        const candidate = (sel + direction * step + jobs.length) % jobs.length;
        if (!marks[jobs[candidate].id]) {
          target = candidate;
          break;
        }
      }
      selectJob(target);
    },
    [jobs, marks, sel, selectJob]
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (showDrop) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      if (!jobs.length) return;
      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'arrowdown') {
        event.preventDefault();
        move(1);
      } else if (key === 'k' || key === 'arrowup') {
        event.preventDefault();
        move(-1);
      } else if (key === 's') {
        event.preventDefault();
        void act('save');
      } else if (key === 'x') {
        event.preventDefault();
        void act('skip');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, jobs.length, move, showDrop]);

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0">
        <p className="eyebrow">Your role landscape</p>
        <h1 className="mt-2 font-display text-[clamp(40px,4.4vw,60px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text">
          Today
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">
            <b>{jobs.length}</b> above {minMatch}
          </span>
          <span className="chip">
            <b>{droppedTotal}</b> screened out
          </span>
          <span className="chip">
            Last scan <b suppressHydrationWarning>{scanLabel}</b>
          </span>
          <span className="chip">
            <b>{reviewed}</b> of {total} reviewed
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {lastScan && (
          <button
            type="button"
            onClick={() => setShowDrop(true)}
            aria-haspopup="dialog"
            className="btn btn-ghost btn-sm"
          >
            See the {droppedTotal}
          </button>
        )}
        <ScanButton />
      </div>
    </header>
  );

  const followUpBanner =
    followUps.length > 0 ? (
      <Link
        href="/pipeline"
        className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-warnLine/60 bg-warnBg/70 px-4 py-2.5 text-sm text-warnInk transition-colors hover:bg-warnBg"
      >
        <span className="min-w-0">
          <b className="font-semibold">
            {followUps.length} follow-up{followUps.length === 1 ? '' : 's'} due
          </b>
          <span className="hidden sm:inline">
            {'. '}
            {followUps[0].title} at {followUps[0].company}
            {followUps.length > 1 ? ` and ${followUps.length - 1} more` : ''}.
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap font-semibold underline decoration-warnInk/40 underline-offset-4">
          Open pipeline
        </span>
      </Link>
    ) : null;

  const errorBanner = error ? (
    <p
      role="alert"
      className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {error}
    </p>
  ) : null;

  if (jobs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-3 pb-28 pt-3 sm:p-4 sm:pb-28 lg:p-5">
        {followUpBanner}
        {errorBanner}
        <section className="card relative overflow-hidden">
          <ContourField className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
          <div className="relative z-10 flex min-h-[68vh] flex-col justify-between gap-12 p-6 sm:p-9 lg:p-12">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="eyebrow">Your role landscape</p>
                <h1 className="mt-2 font-display text-[clamp(42px,5vw,68px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text">
                  Today
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip">
                    <b>0</b> above {minMatch}
                  </span>
                  <span className="chip">
                    <b>{droppedTotal}</b> screened out
                  </span>
                  <span className="chip">
                    Last scan <b suppressHydrationWarning>{scanLabel}</b>
                  </span>
                  <span className="chip">
                    <b>{reviewedToday}</b> reviewed today
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {lastScan && (
                  <button
                    type="button"
                    onClick={() => setShowDrop(true)}
                    aria-haspopup="dialog"
                    className="btn btn-ghost btn-sm"
                  >
                    See the {droppedTotal}
                  </button>
                )}
                <ScanButton />
              </div>
            </div>

            <div className="max-w-[620px]">
              <p className="eyebrow">{reviewedToday > 0 ? 'Daily shortlist clear' : 'A quiet map'}</p>
              <h2 className="mt-3 font-display text-[clamp(30px,4.2vw,52px)] font-semibold leading-[1.02] tracking-[-0.035em] text-text">
                {reviewedToday > 0 ? 'You cleared the map today.' : 'Nothing at your cutoff yet.'}
              </h2>
              <p className="mt-4 max-w-[54ch] text-[16px] leading-[1.7] text-muted">
                {reviewedToday > 0
                  ? `You reviewed ${reviewedToday} role${reviewedToday === 1 ? '' : 's'} today. Your goal was ${goal}. Nothing is waiting to be sent.`
                  : `We only put roles scoring ${minMatch} or higher on the map. Scan again, lower your cutoff in Settings, or look through every match we have.`}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {reviewedToday > 0 && waiting > 0 ? (
                  <Link href={`/?extra=${extra + 10}`} className="btn btn-primary">
                    Review 10 more
                  </Link>
                ) : (
                  <ScanButton />
                )}
                <Link href="/all?minScore=0" className="btn btn-ghost">
                  Browse all matches
                </Link>
                <Link href="/settings" className="btn btn-ghost">
                  Lower the cutoff
                </Link>
              </div>
            </div>
          </div>
        </section>

        {showDrop && lastScan && (
          <DropSheet
            lastScan={lastScan}
            droppedTotal={droppedTotal}
            maxDrop={maxDrop}
            minMatch={minMatch}
            onClose={() => setShowDrop(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-28 pt-3 sm:p-4 sm:pb-28 lg:p-5">
      {followUpBanner}
      {errorBanner}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="card flex min-h-0 min-w-0 flex-col gap-[18px] p-5 sm:p-6"
          aria-label="Today's role map"
        >
          {header}

          <div className="scrollbar-none -mx-1 flex w-full min-w-0 gap-2 overflow-x-auto px-1 pb-1 xl:hidden" aria-label="Roles on the map">
            {jobs.map((item, index) => {
              const active = index === sel;
              const marked = Boolean(marks[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectJob(index)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'bg-accent/10 shadow-[inset_0_0_0_1px_rgba(224,180,90,.35)]'
                      : 'bg-black/20 shadow-[inset_0_0_0_1px_rgb(var(--c-border))]'
                  } ${marked ? 'opacity-45' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${
                      active ? 'bg-accent text-accentInk' : 'bg-bg text-text'
                    }`}
                  >
                    {item.score}
                  </span>
                  <span className="max-w-[150px]">
                    <span className="block truncate text-[13px] font-semibold text-text">{item.company}</span>
                    <span className="block truncate text-[11px] text-muted">{item.title}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="contour-canvas relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]">
            <TodayMap
              jobs={jobs}
              selected={sel}
              marks={marks}
              onSelect={selectJob}
              droppedTotal={droppedTotal}
              lastScanAt={lastScan?.at ?? null}
            />
            {jobs.length > 12 && (
              <span className="absolute bottom-3 left-3 rounded-full bg-bg2/80 px-3 py-1 text-[11px] text-muted backdrop-blur">
                Showing all {jobs.length} roles · labels hidden for room
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted sm:text-[13px]">
            <span className="hidden items-center gap-2 sm:inline-flex">
              <i className="inline-block w-5 border-t-2 border-accent" aria-hidden="true" />
              Contours rise with fit
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="inline-block w-5 border-t-2 border-dashed border-muted" aria-hidden="true" />
              Your cutoff, {minMatch}
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="inline-block w-5 border-t-2 border-dotted border-water" aria-hidden="true" />
              Screened out
            </span>
            <span className="ml-auto hidden xl:inline">Click a peak · J/K to move · S save · X skip</span>
          </div>
        </section>

        <aside className="card-deep flex min-w-0 flex-col gap-[18px] p-5 sm:p-6 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
          {finished ? (
            <div className="flex flex-1 flex-col justify-center gap-6 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent/10 text-accent">
                <Check size={26} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div>
                <p className="eyebrow">Daily shortlist</p>
                <h2 className="mt-2 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-text">
                  That's today's {reviewedNow}.
                </h2>
                <p className="mt-3 text-[15px] leading-[1.65] text-muted">
                  You reviewed every role on the map. Nothing else will be sent to you today. Your goal was{' '}
                  {goal}; you reviewed {reviewed} today.
                </p>
              </div>

              <div className="rounded-[18px] bg-black/20 px-4 py-3.5 text-[13.5px]" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Reviewed today</span>
                  <span className="font-semibold text-text">
                    {reviewed} / {Math.max(goal, reviewed)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (reviewed / Math.max(1, goal)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2.5">
                {waiting > 0 && (
                  <Link href={`/?extra=${extra + 10}`} className="btn btn-primary w-full">
                    Review 10 more
                  </Link>
                )}
                <Link href="/pipeline" className="btn btn-ghost w-full">
                  Open pipeline
                </Link>
                <Link
                  href="/all?minScore=0"
                  className="py-1 text-center text-[12.5px] font-semibold text-muted underline decoration-muted/30 underline-offset-4 hover:text-accent"
                >
                  Browse every match
                </Link>
              </div>
            </div>
          ) : job ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-end gap-3.5">
                  <b className="font-display text-[88px] font-semibold leading-[0.78] tracking-[-0.06em] text-accent">
                    {job.score}
                  </b>
                  <span className="mb-2 rounded-full bg-accent/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent ring-1 ring-inset ring-accent/20">
                    {scoreTag(job.score)}
                  </span>
                </div>
                <span className="chip mt-1">
                  <b>{reviewed}</b>/{total}
                </span>
              </div>

              <div>
                <p className="eyebrow">Selected peak</p>
                <h2 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.025em] text-text">
                  {job.title}
                </h2>
                <p className="mt-2 text-[14px] text-muted">
                  <b className="font-semibold text-text/90">{job.company}</b>
                  {job.location ? ` · ${job.location}` : ''}
                  {job.postedAt ? (
                    <>
                      {' · '}
                      <span suppressHydrationWarning>{ago(job.postedAt)}</span>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <section>
                  <h3 className="eyebrow">Why it fits</h3>
                  {job.checks.length ? (
                    <ul className="mt-2.5 flex flex-col gap-2">
                      {job.checks.slice(0, 4).map((check, index) => (
                        <li key={`${job.id}-check-${index}`} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-text/90">
                          <Check size={15} strokeWidth={2.4} className="mt-[3px] shrink-0 text-accent" aria-hidden="true" />
                          <span>{check}</span>
                        </li>
                      ))}
                      {job.checks.length > 4 && (
                        <li className="pl-[25px] text-[12.5px] text-muted">+{job.checks.length - 4} more</li>
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[14px] text-muted">Scored against your profile and must-haves.</p>
                  )}
                </section>

                <section>
                  <h3 className="eyebrow">Worth checking</h3>
                  {job.gaps.length ? (
                    <ul className="mt-2.5 flex flex-col gap-2">
                      {job.gaps.slice(0, 3).map((gap, index) => (
                        <li key={`${job.id}-gap-${index}`} className="flex gap-2.5 text-[14px] leading-[1.45] text-muted">
                          <Info size={15} strokeWidth={2.1} className="mt-[3px] shrink-0 text-water" aria-hidden="true" />
                          <span>{gap}</span>
                        </li>
                      ))}
                      {job.gaps.length > 3 && (
                        <li className="pl-[25px] text-[12.5px] text-muted">+{job.gaps.length - 3} more</li>
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 inline-flex items-center gap-2 text-[14px] text-muted">
                      <Check size={15} strokeWidth={2.3} className="text-water" aria-hidden="true" />
                      No material gaps found.
                    </p>
                  )}
                </section>

                {job.excerpt && (
                  <details className="group rounded-[18px] bg-black/15 px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] font-semibold text-text">
                      Role notes
                      <ChevronDown
                        size={15}
                        className="text-muted transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="mt-2.5 text-[13px] leading-[1.65] text-muted">{job.excerpt}</p>
                  </details>
                )}

                <div
                  className="rounded-[18px] bg-black/20 px-4 py-3.5"
                  style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
                >
                  <div className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="text-muted">Tailored kit</span>
                    <span
                      className={
                        job.kitStatus
                          ? 'font-semibold text-accent'
                          : 'font-semibold text-muted'
                      }
                    >
                      {kitLabel(job.kitStatus)}
                    </span>
                  </div>
                  {job.kitStatus ? (
                    <Link
                      href={`/kit-studio?job=${job.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-water hover:text-text"
                    >
                      Open in Kit Studio
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted/80">
                      Review the role to start the tailored CV, cover letter and form packet.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2.5 pt-1">
                <Link href={`/jobs/${job.id}`} className="btn btn-primary w-full">
                  Review this role
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => void act('save')} className="btn btn-ghost btn-sm">
                    Save
                  </button>
                  <button type="button" onClick={() => void act('skip')} className="btn btn-ghost btn-sm">
                    Skip
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <button
                    type="button"
                    onClick={() => setShowWhy((value) => !value)}
                    aria-expanded={showWhy}
                    className="text-[12.5px] font-medium text-muted underline decoration-muted/30 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent/40"
                  >
                    Not for me, because…
                  </button>
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-water hover:text-text"
                    >
                      Open posting
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  )}
                </div>

                {showWhy && (
                  <div className="flex flex-wrap gap-2 rounded-[18px] bg-black/15 p-3">
                    {REASONS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => void act('reject', value)}
                        className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                        style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-center text-[11.5px] leading-relaxed text-muted/75">
                  Nothing sends until you approve it.
                </p>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {showDrop && lastScan && (
        <DropSheet
          lastScan={lastScan}
          droppedTotal={droppedTotal}
          maxDrop={maxDrop}
          minMatch={minMatch}
          onClose={() => setShowDrop(false)}
        />
      )}
    </div>
  );
}
