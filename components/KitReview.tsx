'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { FormAnswers, Job, Kit } from '@/lib/types';
import { ArrowUpRight, Check, Clipboard, PencilLine, X } from 'lucide-react';

const FORM_FIELDS: Array<{ key: keyof FormAnswers; label: string; multiline?: boolean }> = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'work_auth_notes', label: 'Work authorization notes', multiline: true },
  { key: 'why_this_role', label: 'Why this role', multiline: true },
];

const EMPTY_FORM: FormAnswers = {
  name: '',
  email: '',
  location: '',
  work_auth_notes: '',
  why_this_role: '',
};

function formFromKit(form: FormAnswers | null): FormAnswers {
  return { ...EMPTY_FORM, ...(form ?? {}) };
}

export default function KitReview({ job, kit }: { job: Job; kit: Kit }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftCv, setDraftCv] = useState(kit.tailored_cv_md ?? '');
  const [draftLetter, setDraftLetter] = useState(kit.cover_letter ?? '');
  const [draftPoints, setDraftPoints] = useState((kit.talking_points ?? []).join('\n'));
  const [draftForm, setDraftForm] = useState<FormAnswers>(formFromKit(kit.form_answers_json));
  const [copyLabel, setCopyLabel] = useState('Copy cover letter');

  function startEditing() {
    setDraftCv(kit.tailored_cv_md ?? '');
    setDraftLetter(kit.cover_letter ?? '');
    setDraftPoints((kit.talking_points ?? []).join('\n'));
    setDraftForm(formFromKit(kit.form_answers_json));
    setError(null);
    setNotice(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function saveKit() {
    if (!draftCv.trim() || !draftLetter.trim()) {
      setError('The tailored CV and cover letter cannot be empty.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const talkingPoints = draftPoints
      .split('\n')
      .map((point) => point.trim())
      .filter(Boolean);
    const formAnswers: FormAnswers = {
      name: draftForm.name.trim(),
      email: draftForm.email.trim(),
      location: draftForm.location.trim(),
      work_auth_notes: draftForm.work_auth_notes.trim(),
      why_this_role: draftForm.why_this_role.trim(),
    };

    const { error: kitError } = await supabase
      .from('kits')
      .update({
        tailored_cv_md: draftCv.trim(),
        cover_letter: draftLetter.trim(),
        talking_points: talkingPoints,
        form_answers_json: formAnswers,
        // Any change produces a fresh draft. An approved kit must be read and
        // approved again before it can be considered ready to send.
        status: 'draft',
        approved_at: null,
      })
      .eq('id', kit.id);

    if (kitError) {
      setBusy(false);
      setError(kitError.message);
      return;
    }

    // Keep the pipeline honest: a kit that was ready to send is no longer
    // ready once its content changes. Roles already further along (applied,
    // interview, offer) are left alone.
    if (job.status === 'kit_ready') {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'saved', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      if (jobError) {
        setBusy(false);
        setEditing(false);
        setError(`Kit saved, but the pipeline status could not be updated: ${jobError.message}`);
        router.refresh();
        return;
      }
    }

    setBusy(false);
    setEditing(false);
    setNotice(
      kit.status === 'approved'
        ? 'Changes saved. Approval was reset, so re-approve the kit when you are ready.'
        : 'Changes saved. Review the new draft, then approve it when you are ready.'
    );
    router.refresh();
  }

  async function setKitStatus(status: 'approved' | 'needs_edit') {
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { error: kitError } = await supabase
      .from('kits')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', kit.id);

    if (kitError) {
      setBusy(false);
      setError(kitError.message);
      return;
    }

    if (status === 'approved') {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'kit_ready', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      if (jobError) {
        setBusy(false);
        setError(jobError.message);
        return;
      }
    }

    setBusy(false);
    router.refresh();
  }

  async function handleCopyLetter() {
    const text = editing ? draftLetter : kit.cover_letter;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy cover letter'), 1500);
    } catch {
      setCopyLabel('Copy failed, select the text manually');
      setTimeout(() => setCopyLabel('Copy cover letter'), 2000);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Tailored kit</p>
          <h1 className="mt-2 font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.05] tracking-[-0.035em] text-text">
            {job.title}
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            <b className="font-semibold text-text/90">{job.company}</b>
            {job.location ? ` · ${job.location}` : ''}
          </p>
        </div>
        {job.match_score !== null && (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[22px] font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/25">
            {job.match_score}
          </div>
        )}
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-2xl bg-black/15 p-3" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
        <StatusBadge status={kit.status} />
        {editing ? (
          <>
            <button onClick={saveKit} disabled={busy} className="btn btn-primary btn-sm disabled:opacity-50">
              <Check size={15} aria-hidden="true" />
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={cancelEditing} disabled={busy} className="btn btn-ghost btn-sm disabled:opacity-50">
              <X size={14} aria-hidden="true" />
              Cancel
            </button>
            <span className="ml-auto text-[11px] text-muted/75">
              Saving creates a new draft. Re-approve it when the edits are ready.
            </span>
          </>
        ) : (
          <>
            <button onClick={startEditing} disabled={busy} className="btn btn-ghost btn-sm disabled:opacity-50">
              <PencilLine size={14} aria-hidden="true" />
              Edit kit
            </button>
            {kit.status !== 'approved' && (
              <button
                onClick={() => setKitStatus('approved')}
                disabled={busy}
                className="btn btn-primary btn-sm disabled:opacity-50"
              >
                <Check size={15} aria-hidden="true" />
                Approve kit
              </button>
            )}
            {kit.status !== 'needs_edit' && (
              <button
                onClick={() => setKitStatus('needs_edit')}
                disabled={busy}
                className="btn btn-ghost btn-sm disabled:opacity-50"
              >
                <PencilLine size={14} aria-hidden="true" />
                Needs edit
              </button>
            )}
            <span className="ml-auto text-[11px] text-muted/75">
              {kit.status === 'approved'
                ? 'Approved and ready to send.'
                : 'Nothing is sent from RoleSearchHQ. Approve means ready for your final send.'}
            </span>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
      {notice && <p role="status" className="mt-3 text-[13px] text-good">{notice}</p>}
      {!error && !notice && kit.status === 'approved' && !editing && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Editing the CV, cover letter, talking points or form answers will reset approval so the new version is
          reviewed first.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-[18px] font-semibold text-text">Tailored CV</h2>
              <span className="text-[11px] text-muted">{editing ? 'Markdown is fine' : 'Reordered from your master CV'}</span>
            </div>
            {editing ? (
              <textarea
                rows={18}
                value={draftCv}
                onChange={(event) => setDraftCv(event.target.value)}
                spellCheck
                className="field-input mt-3 w-full resize-y py-3 font-sans text-[13.5px] leading-[1.65]"
              />
            ) : (
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-4 font-sans text-[13.5px] leading-[1.65] text-text/90">
                {kit.tailored_cv_md}
              </pre>
            )}
          </section>

          <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[18px] font-semibold text-text">Cover letter</h2>
              {!editing && (
                <button onClick={handleCopyLetter} className="btn btn-ghost btn-sm text-[12px]">
                  <Clipboard size={14} aria-hidden="true" />
                  {copyLabel}
                </button>
              )}
            </div>
            {editing ? (
              <textarea
                rows={12}
                value={draftLetter}
                onChange={(event) => setDraftLetter(event.target.value)}
                spellCheck
                className="field-input mt-3 w-full resize-y py-3 font-sans text-[13.5px] leading-[1.7]"
              />
            ) : (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-[13.5px] leading-[1.7] text-text/90">
                {kit.cover_letter}
              </p>
            )}
          </section>

          {(editing || kit.form_answers_json) && (
            <section className="rounded-2xl bg-surface p-5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[18px] font-semibold text-text">Form packet</h2>
                <span className="text-[11px] text-muted">Answers you can paste into an application</span>
              </div>
              {editing ? (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {FORM_FIELDS.map(({ key, label, multiline }) => (
                    <label key={key} className="flex flex-col gap-1 text-[11px] font-medium text-muted">
                      {label}
                      {multiline ? (
                        <textarea
                          rows={key === 'why_this_role' ? 5 : 3}
                          value={draftForm[key]}
                          onChange={(event) =>
                            setDraftForm((current) => ({ ...current, [key]: event.target.value }))
                          }
                          className="field-input resize-y py-2 text-[13px] leading-relaxed"
                        />
                      ) : (
                        <input
                          value={draftForm[key]}
                          onChange={(event) =>
                            setDraftForm((current) => ({ ...current, [key]: event.target.value }))
                          }
                          className="field-input py-2 text-[13px]"
                        />
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <dl className="mt-3 flex flex-col gap-2.5">
                  {Object.entries(kit.form_answers_json ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-black/20 p-3.5">
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="mt-1 text-[13.5px] leading-relaxed text-text/90">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {(editing || (kit.talking_points && kit.talking_points.length > 0)) && (
            <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <p className="eyebrow">Talking points</p>
              {editing ? (
                <>
                  <textarea
                    rows={9}
                    value={draftPoints}
                    onChange={(event) => setDraftPoints(event.target.value)}
                    placeholder="One point per line"
                    className="field-input mt-3 w-full resize-y py-2 text-[12.5px] leading-relaxed"
                  />
                  <p className="mt-2 text-[10.5px] text-muted/75">One point per line.</p>
                </>
              ) : (
                <ul className="mt-3 flex flex-col gap-2.5">
                  {(kit.talking_points ?? []).map((t, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-text/85">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {kit.gap_note && (
            <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
              <p className="eyebrow">Gap handling</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{kit.gap_note}</p>
            </section>
          )}

          <Link href={`/jobs/${job.id}`} className="btn btn-ghost btn-sm w-full">
            Open full job detail
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </div>
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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${styles[status] ?? styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
