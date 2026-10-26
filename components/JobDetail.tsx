'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clipboard,
  Download,
  PencilLine,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ApplicationTracker from '@/components/ApplicationTracker';
import { hasJobCrm, readJobCrm } from '@/lib/job-crm';
import type { Job, Kit } from '@/lib/types';

const STATUSES = ['new', 'saved', 'kit_ready', 'applied', 'interview', 'rejected', 'offer', 'ignored'];
const TABS = ['Overview', 'Tailored CV', 'Cover letter', 'Form packet'] as const;
const REJECT_REASONS = ['wrong seniority', 'wrong domain', 'too thin'] as const;

function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function JobDetail({ job, kit }: { job: Job; kit: Kit | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy cover letter');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [nextAction, setNextAction] = useState(job.next_action ?? '');
  const [nextDate, setNextDate] = useState(job.next_date ?? '');
  const [showUndo, setShowUndo] = useState(false);
  const [interviewNotes, setInterviewNotes] = useState(job.interview_notes ?? '');
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const showApplicationTracker =
    hasJobCrm(readJobCrm(job.raw_json)) || !['new', 'ignored'].includes(job.status);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate-kit`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setGenError(body.error ?? `Kit generation failed (${res.status}).`);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Kit generation request failed to complete.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value;
    if (nextStatus === 'applied' && !nextDate) {
      setStatusError('Set a follow-up date below before moving this to Applied.');
      return;
    }
    const supabase = createClient();
    const update: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
    if (nextStatus === 'applied') {
      update.next_action = nextAction || null;
      update.next_date = nextDate || null;
    }
    const { error } = await supabase.from('jobs').update(update).eq('id', job.id);
    if (error) {
      setStatusError(error.message);
    } else {
      setStatusError(null);
      router.refresh();
    }
  }

  async function handleSaveNextAction() {
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('jobs')
      .update({ next_action: nextAction || null, next_date: nextDate || null, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setActionBusy(false);
    if (error) setActionError(error.message);
    else router.refresh();
  }

  async function handleSaveToPipeline() {
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'saved', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setActionBusy(false);
    if (error) setActionError(error.message);
    else router.refresh();
  }

  async function handleApproveKit() {
    if (!kit) return;
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const { error: kitError } = await supabase
      .from('kits')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', kit.id);
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'kit_ready', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setActionBusy(false);
    const error = kitError ?? jobError;
    if (error) setActionError(error.message);
    else router.refresh();
  }

  async function handleReject() {
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const term = rejectReason === 'wrong domain' ? job.company : job.title;

    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'rejected', reject_reason: rejectReason, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    const { error: rejectionError } = await supabase
      .from('rejections')
      .insert({ user_id: job.user_id, job_id: job.id, reason: rejectReason, term });

    setActionBusy(false);
    const error = jobError ?? rejectionError;
    if (error) setActionError(error.message);
    else {
      setShowRejectForm(false);
      setShowUndo(true);
      router.refresh();
    }
  }

  async function handleUndoReject() {
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/undo-reject`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActionError(body.error ?? `Undo failed (${res.status}).`);
      } else {
        setShowUndo(false);
        router.refresh();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Undo failed to complete.');
    }
    setActionBusy(false);
  }

  async function handleSaveInterviewNotes() {
    setNotesStatus('saving');
    const supabase = createClient();
    const { error } = await supabase
      .from('jobs')
      .update({ interview_notes: interviewNotes || null, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setNotesStatus(error ? 'error' : 'idle');
    if (!error) router.refresh();
  }

  async function handleCopyLetter() {
    if (!kit?.cover_letter) return;
    try {
      await navigator.clipboard.writeText(kit.cover_letter);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy cover letter'), 1500);
    } catch {
      setCopyLabel('Copy failed, select the text manually');
      setTimeout(() => setCopyLabel('Copy cover letter'), 2000);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:py-8">
      <nav className="flex items-center gap-2 text-[12px] text-muted" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-text">
          Today
        </Link>
        <span className="text-muted/40">/</span>
        <Link href="/all?minScore=0" className="transition-colors hover:text-text">
          All matches
        </Link>
      </nav>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow">Role detail</p>
          <h1 className="mt-2 font-display text-[clamp(30px,4.2vw,48px)] font-semibold leading-[1.03] tracking-[-0.04em] text-text">
            {job.title}
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
            <b className="font-semibold text-text/90">{job.company}</b>
            {job.location ? ` · ${job.location}` : ''}
            {job.posted_at ? ` · posted ${shortDate(job.posted_at)}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip capitalize">{job.status.replace('_', ' ')}</span>
            {job.source && <span className="chip">via {job.source}</span>}
            {job.match_score !== null && (
              <span className="chip">
                <b>{job.match_score}</b> match
              </span>
            )}
            {job.fit_tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-accent/10 px-3 py-1.5 text-[11.5px] font-medium text-accent ring-1 ring-inset ring-accent/20">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:gap-2">
          {job.match_score !== null && (
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-[23px] font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/25">
              {job.match_score}
            </div>
          )}
          <div className="ml-auto flex min-w-0 flex-col items-end gap-1 sm:ml-0">
            <label className="sr-only" htmlFor="job-status">
              Pipeline status
            </label>
            <select
              id="job-status"
              value={job.status}
              onChange={handleStatusChange}
              className="field-input w-auto min-w-[150px] py-2 text-[13px] capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
            {statusError && <p className="max-w-[220px] text-right text-[11px] text-danger">{statusError}</p>}
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          Open official apply page
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        {job.status !== 'saved' && (
          <button
            onClick={handleSaveToPipeline}
            disabled={actionBusy}
            className="btn btn-ghost btn-sm disabled:opacity-50"
          >
            Save to pipeline
          </button>
        )}
        {!kit && (
          <button onClick={handleGenerate} disabled={generating} className="btn btn-ghost btn-sm disabled:opacity-50">
            <Sparkles size={15} aria-hidden="true" />
            {generating ? 'Generating kit…' : 'Generate kit'}
          </button>
        )}
        {kit && (
          <>
            <a href={`/api/jobs/${job.id}/pdf`} className="btn btn-ghost btn-sm">
              <Download size={15} aria-hidden="true" />
              Download CV
            </a>
            <Link href={`/kit-studio?job=${job.id}`} className="btn btn-ghost btn-sm">
              <PencilLine size={15} aria-hidden="true" />
              Edit kit
            </Link>
          </>
        )}
        {!showRejectForm ? (
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={actionBusy}
            className="ml-auto text-[12px] font-semibold text-muted underline decoration-muted/30 underline-offset-4 transition-colors hover:text-danger"
          >
            Reject this role
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="field-input w-auto py-1.5 text-[12.5px]"
            >
              {REJECT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button onClick={handleReject} disabled={actionBusy} className="btn btn-sm bg-danger text-[#2A0E0B] disabled:opacity-50">
              Confirm reject
            </button>
            <button onClick={() => setShowRejectForm(false)} className="px-2 py-1.5 text-[12px] text-muted hover:text-text">
              Cancel
            </button>
          </div>
        )}
      </div>
      {genError && <p className="mt-3 text-[13px] text-danger">{genError}</p>}
      {actionError && <p className="mt-3 text-[13px] text-danger">{actionError}</p>}
      {showUndo && job.status === 'rejected' && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <span className="text-[13px] text-muted">Rejected. The matcher will remember why.</span>
          <button onClick={handleUndoReject} disabled={actionBusy} className="text-[13px] font-semibold text-accent hover:underline disabled:opacity-50">
            Undo
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="flex min-w-0 flex-col gap-5">
          {job.match_score !== null && (
            <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              {job.domain_score === null &&
              job.skills_score === null &&
              job.seniority_score === null &&
              job.location_score === null ? (
                <p className="text-[13px] leading-relaxed text-muted">
                  This role was scored before the current matcher existed, so there is no breakdown. Re-score from
                  Settings → Maintenance to rebuild it.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-end gap-3">
                      <b className="font-display text-[52px] font-semibold leading-[0.8] tracking-[-0.05em] text-accent">
                        {job.match_score}
                      </b>
                      <span className="mb-1.5 text-[13px] text-muted">overall match</span>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Four signals</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                    <ScoreBar label="Domain" value={job.domain_score} />
                    <ScoreBar label="Skills" value={job.skills_score} />
                    <ScoreBar label="Seniority" value={job.seniority_score} />
                    <ScoreBar label="Location" value={job.location_score} />
                  </div>
                </>
              )}
            </section>
          )}

          {!kit ? (
            <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Sparkles size={22} className="mx-auto text-accent/80" aria-hidden="true" />
                <h2 className="mt-3 font-display text-[22px] font-semibold text-text">No kit yet</h2>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
                  Generate one tailored CV, cover letter and form packet for this role. It pulls only from the CV
                  and proof points in Settings.
                </p>
                <button onClick={handleGenerate} disabled={generating} className="btn btn-primary btn-sm mt-4 disabled:opacity-50">
                  {generating ? 'Generating…' : 'Generate this kit'}
                </button>
              </div>
              <div className="mt-6">
                <OverviewPanel job={job} kit={null} />
              </div>
            </section>
          ) : (
            <section className="rounded-2xl bg-surface p-4 sm:p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">The kit</p>
                  <h2 className="mt-1.5 font-display text-[22px] font-semibold tracking-[-0.02em] text-text">
                    Drafted for this role only
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={kit.status} />
                  <Link
                    href={`/kit-studio?job=${job.id}`}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-accent"
                  >
                    Kit Studio
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1 sm:flex sm:flex-nowrap">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-center text-[12.5px] font-semibold transition-colors sm:text-left ${
                      tab === t ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {tab === 'Overview' && <OverviewPanel job={job} kit={kit} />}

                {tab === 'Tailored CV' && (
                  <pre className="whitespace-pre-wrap rounded-xl bg-black/20 p-4 font-sans text-[13.5px] leading-[1.7] text-text/90">
                    {kit.tailored_cv_md}
                  </pre>
                )}

                {tab === 'Cover letter' && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] text-muted">Written in your voice, with role-specific evidence.</p>
                      <button onClick={handleCopyLetter} className="btn btn-ghost btn-sm text-[12px]">
                        <Clipboard size={14} aria-hidden="true" />
                        {copyLabel}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-[13.5px] leading-[1.7] text-text/90">
                      {kit.cover_letter}
                    </p>
                  </div>
                )}

                {tab === 'Form packet' && (
                  <div>
                    {kit.form_answers_json ? (
                      <dl className="flex flex-col gap-3">
                        {Object.entries(kit.form_answers_json).map(([key, value]) => (
                          <div key={key} className="rounded-xl bg-black/20 p-3.5">
                            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                              {key.replace(/_/g, ' ')}
                            </dt>
                            <dd className="mt-1 text-[13.5px] leading-relaxed text-text/90">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted">
                        No form answers were generated for this kit.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {kit.facts_used && kit.facts_used.length > 0 && (
                <details className="group mt-5 border-t border-border pt-4 text-[12px] text-muted">
                  <summary className="cursor-pointer list-none font-semibold text-muted transition-colors hover:text-text">
                    Facts used in this kit
                    <span className="ml-2 font-normal text-muted/60">{kit.facts_used.length}</span>
                  </summary>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                    {kit.facts_used.map((fact, index) => (
                      <li key={index}>{fact}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
        </main>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-5">
          <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <h2 className="font-display text-[16px] font-semibold text-text">Next action</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              What moves this role forward, and when.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Follow up with recruiter"
                className="field-input py-2 text-[13px]"
              />
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="field-input py-2 text-[13px]"
              />
              <button onClick={handleSaveNextAction} disabled={actionBusy} className="btn btn-ghost btn-sm disabled:opacity-50">
                Save next action
              </button>
            </div>
          </section>

          {showApplicationTracker && <ApplicationTracker job={job} />}

          {kit && (
            <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-[16px] font-semibold text-text">Kit status</h2>
                <StatusBadge status={kit.status} />
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                {kit.status === 'approved'
                  ? 'Approved. This kit is ready for your final send.'
                  : 'Read the kit. Approving marks it ready to send; it never sends on its own.'}
              </p>
              {kit.status !== 'approved' ? (
                <button
                  onClick={handleApproveKit}
                  disabled={actionBusy}
                  className="btn btn-primary btn-sm mt-3 w-full disabled:opacity-50"
                >
                  <Check size={15} aria-hidden="true" />
                  Approve kit
                </button>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-good">
                  <Check size={14} aria-hidden="true" /> Ready to send
                </p>
              )}
            </section>
          )}

          {(job.status === 'interview' || job.interview_notes) && (
            <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <h2 className="font-display text-[16px] font-semibold text-text">Interview notes</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Questions to ask, names, things to prep.
              </p>
              <textarea
                rows={4}
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="What to prep, questions to ask, who you're meeting"
                className="field-input mt-3 resize-y py-2 text-[12.5px] leading-relaxed"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={handleSaveInterviewNotes}
                  disabled={notesStatus === 'saving'}
                  className="btn btn-ghost btn-sm disabled:opacity-50"
                >
                  {notesStatus === 'saving' ? 'Saving…' : 'Save notes'}
                </button>
                {notesStatus === 'error' && <span className="text-[11px] text-danger">Couldn't save.</span>}
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-black/15 p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <p className="eyebrow">Source</p>
            <dl className="mt-2 flex flex-col gap-2 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Board</dt>
                <dd className="text-text">{job.source || 'Unknown'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">First seen</dt>
                <dd className="text-text">{shortDate(job.first_seen_at)}</dd>
              </div>
              {job.posted_at && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Posted</dt>
                  <dd className="text-text">{shortDate(job.posted_at)}</dd>
                </div>
              )}
            </dl>
            <Link href="/all?minScore=0" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-accent">
              <ArrowLeft size={12} aria-hidden="true" />
              Back to all matches
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function OverviewPanel({ job, kit }: { job: Job; kit: Kit | null }) {
  return (
    <div className="flex flex-col gap-5">
      {job.match_why && job.match_why.length > 0 && (
        <section>
          <h3 className="eyebrow">Why it fits</h3>
          <ul className="mt-2.5 flex flex-col gap-2">
            {job.match_why.map((why, index) => (
              <li key={index} className="flex gap-2.5 text-[13.5px] leading-relaxed text-text/90">
                <Check size={14} strokeWidth={2.4} className="mt-[3px] shrink-0 text-accent" aria-hidden="true" />
                {why}
              </li>
            ))}
          </ul>
        </section>
      )}

      {job.match_gaps && job.match_gaps.length > 0 && (
        <section>
          <h3 className="eyebrow">Worth checking</h3>
          <ul className="mt-2.5 flex flex-col gap-2">
            {job.match_gaps.map((gap, index) => (
              <li key={index} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                <PencilLine size={13} className="mt-[3px] shrink-0 text-water" aria-hidden="true" />
                {gap}
              </li>
            ))}
          </ul>
        </section>
      )}

      {kit?.gap_note && (
        <section>
          <h3 className="eyebrow">Gap handling</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-text/85">{kit.gap_note}</p>
        </section>
      )}

      {kit?.talking_points && kit.talking_points.length > 0 && (
        <section>
          <h3 className="eyebrow">Talking points</h3>
          <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-text/85">
            {kit.talking_points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {job.visa_location_risk && (
        <section>
          <h3 className="eyebrow">Visa / location risk</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-text/85">{job.visa_location_risk}</p>
        </section>
      )}

      {job.description && (
        <details className="group border-t border-border pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12.5px] font-semibold text-muted transition-colors hover:text-text">
            Full job description
            <PencilLine size={14} className="text-muted/60 transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/15 p-4 text-[13px] leading-[1.7] text-text/80">
            {job.description}
          </p>
        </details>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-water/10 text-water ring-water/20',
    needs_edit: 'bg-warnBg/70 text-warnInk ring-warnLine/40',
    approved: 'bg-accent/10 text-accent ring-accent/20',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${
        styles[status] ?? styles.draft
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-text/80">{value === null ? 'n/a' : value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
