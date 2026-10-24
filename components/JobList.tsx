'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Job } from '@/lib/types';
import { relativeAge } from '@/lib/format';

// The list only needs a slice of a job row. Typing it this way lets the All
// matches page pass its lighter SELECT result without loading every column.
export type JobListItem = Pick<
  Job,
  | 'id'
  | 'title'
  | 'company'
  | 'location'
  | 'match_score'
  | 'match_why'
  | 'fit_tags'
  | 'match_gaps'
  | 'domain_score'
  | 'skills_score'
  | 'seniority_score'
  | 'location_score'
  | 'posted_at'
  | 'fingerprint'
>;

function scoreClass(score: number | null): string {
  if (score === null) return 'text-muted';
  if (score >= 85) return 'text-accent';
  if (score >= 70) return 'text-water';
  return 'text-muted';
}

function companyMark(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function JobList({ jobs }: { jobs: JobListItem[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fingerprintCounts = new Map<string, number>();
  for (const j of jobs) {
    if (!j.fingerprint) continue;
    fingerprintCounts.set(j.fingerprint, (fingerprintCounts.get(j.fingerprint) ?? 0) + 1);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === jobs.length ? new Set() : new Set(jobs.map((j) => j.id))));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setError(null);
  }

  async function runBulkAction(action: 'ignore' | 'reject' | 'save') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Bulk action failed (${res.status}).`);
        setBusy(false);
        return;
      }
      exitSelectMode();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed to complete.');
    }
    setBusy(false);
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <p className="mx-auto max-w-md text-[14px] leading-relaxed text-muted">
          No matches yet. RoleSearchHQ scores roles against your titles and must-haves. Add a role by URL or
          wait for the next scan.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        {!selectMode ? (
          <button
            onClick={() => setSelectMode(true)}
            className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-white/[0.09] hover:text-text"
            style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
          >
            Select
          </button>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-2.5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
              <input
                type="checkbox"
                checked={selected.size === jobs.length}
                onChange={toggleSelectAll}
                className="accent-accent"
              />
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </label>
            {selected.size > 0 && (
              <>
                <button
                  onClick={() => runBulkAction('save')}
                  disabled={busy}
                  className="text-[12px] font-semibold text-accent hover:underline disabled:opacity-50"
                >
                  Save to pipeline
                </button>
                <button
                  onClick={() => runBulkAction('ignore')}
                  disabled={busy}
                  className="text-[12px] text-muted hover:text-text hover:underline disabled:opacity-50"
                >
                  Ignore
                </button>
                <button
                  onClick={() => runBulkAction('reject')}
                  disabled={busy}
                  className="text-[12px] text-danger hover:underline disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            <button onClick={exitSelectMode} className="ml-auto text-[12px] text-muted hover:text-text">
              Done
            </button>
          </div>
        )}
      </div>
      {error && <p className="mb-3 text-[12px] text-danger">{error}</p>}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => {
          const age = relativeAge(job.posted_at);
          const why = job.match_why?.[0];
          const isDuplicate = job.fingerprint && (fingerprintCounts.get(job.fingerprint) ?? 0) > 1;
          const isSelected = selected.has(job.id);
          return (
            <li key={job.id} className="flex items-start gap-2">
              {selectMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(job.id)}
                  className="mt-6 shrink-0 accent-accent"
                  aria-label={`Select ${job.title}`}
                />
              )}
              <Link
                href={`/jobs/${job.id}`}
                onClick={(e) => {
                  if (selectMode) {
                    e.preventDefault();
                    toggle(job.id);
                  }
                }}
                className={`grid flex-1 grid-cols-[46px_1fr_auto] items-start gap-3 rounded-2xl px-4 py-4 transition-all duration-150 hover:-translate-y-px hover:bg-surfaceHover ${
                  isSelected ? 'bg-accent/[0.06]' : 'bg-surface'
                }`}
                style={{
                  boxShadow: isSelected
                    ? 'inset 0 0 0 1px rgba(224,180,90,.55)'
                    : 'inset 0 0 0 1px rgb(var(--c-border))',
                }}
              >
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-bg text-[13px] font-semibold text-accent ring-1 ring-inset ring-border">
                  {companyMark(job.company)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-text">{job.title}</p>
                    {isDuplicate && (
                      <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] text-muted ring-1 ring-inset ring-border">
                        possible duplicate
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-muted">
                    <span>{job.company}</span>
                    {job.location && <span>· {job.location}</span>}
                    {age && (
                      <span suppressHydrationWarning>
                        · {age}
                      </span>
                    )}
                  </p>
                  {why && <p className="mt-2 text-[13.5px] leading-relaxed text-text/80">{why}</p>}
                  {((job.fit_tags?.length ?? 0) > 0 || (job.match_gaps?.length ?? 0) > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.fit_tags?.slice(0, 3).map((tag) => (
                        <span
                          key={`fit-${tag}`}
                          className="rounded-full bg-accent/10 px-2 py-1 text-[10.5px] font-medium text-accent ring-1 ring-inset ring-accent/20"
                        >
                          {tag}
                        </span>
                      ))}
                      {job.match_gaps?.slice(0, 2).map((tag) => (
                        <span
                          key={`gap-${tag}`}
                          className="rounded-full bg-water/10 px-2 py-1 text-[10.5px] font-medium text-water ring-1 ring-inset ring-water/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  {job.match_score !== null &&
                    (job.domain_score === null &&
                    job.skills_score === null &&
                    job.seniority_score === null &&
                    job.location_score === null ? (
                      <span className="text-[11px] text-muted">unscored</span>
                    ) : (
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg text-[15px] font-bold tabular-nums ring-1 ring-inset ring-border ${scoreClass(job.match_score)}`}>
                        {job.match_score}
                      </span>
                    ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
