'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MaintenancePanel() {
  const router = useRouter();
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<string | null>(null);
  const [clearScope, setClearScope] = useState('rejected');
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [testingDigest, setTestingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<string | null>(null);

  async function handleRescore() {
    setRescoring(true);
    setRescoreResult(null);
    let after: string | undefined;
    let rescored = 0;
    let excluded = 0;
    let duplicates = 0;
    try {
      // The server does a page at a time; keep asking until it says done.
      for (let page = 0; page < 500; page++) {
        const res = await fetch('/api/jobs/rescore-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ after }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRescoreResult(data.error ?? `Rescore failed (${res.status}).`);
          setRescoring(false);
          return;
        }
        rescored += data.rescored ?? 0;
        excluded += data.excluded ?? 0;
        duplicates += data.duplicates ?? 0;
        setRescoreResult(`Working... ${rescored} rescored so far.`);
        if (data.done || !data.next) break;
        after = data.next;
      }
      setRescoreResult(
        `Rescored ${rescored}. ${excluded} moved to rejected (language, on-site, region or deal-breaker). ${duplicates} duplicates hidden.`
      );
      router.refresh();
    } catch (err) {
      setRescoreResult(err instanceof Error ? err.message : 'Rescore failed to complete.');
    }
    setRescoring(false);
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearing(true);
    setClearResult(null);
    try {
      const res = await fetch('/api/jobs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: clearScope }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClearResult(data.error ?? `Clear failed (${res.status}).`);
      } else {
        setClearResult(`Deleted ${data.deleted} job${data.deleted === 1 ? '' : 's'}.`);
        router.refresh();
      }
    } catch (err) {
      setClearResult(err instanceof Error ? err.message : 'Clear failed to complete.');
    }
    setClearing(false);
    setConfirmClear(false);
  }

  async function handleTestDigest() {
    setTestingDigest(true);
    setDigestResult(null);
    try {
      const res = await fetch('/api/digest/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setDigestResult(data.error ?? `Test send failed (${res.status}).`);
      } else {
        setDigestResult(
          data.matchCount > 0
            ? `Sent, ${data.matchCount} match${data.matchCount === 1 ? '' : 'es'} included.`
            : 'Sent (nothing above your cutoff right now, so an empty digest went out).'
        );
      }
    } catch (err) {
      setDigestResult(err instanceof Error ? err.message : 'Test send failed to complete.');
    }
    setTestingDigest(false);
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <p className="eyebrow">Maintenance</p>
      <h2 className="mt-2 font-display text-[22px] font-semibold text-text">Keep the map honest</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Re-score old roles, clear what you no longer need, or take your data with you.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-black/15 p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <h3 className="text-[14px] font-semibold text-text">Re-score all jobs</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Applies your current titles, must-haves and deal-breakers to every job already in the Today list —
            not just new scans. Anything hitting a deal-breaker moves to Rejected.
          </p>
          <button
            onClick={handleRescore}
            disabled={rescoring}
            className="btn btn-ghost btn-sm mt-3 disabled:opacity-50"
          >
            {rescoring ? 'Rescoring…' : 'Re-score all jobs'}
          </button>
          {rescoreResult && <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{rescoreResult}</p>}
        </div>

        <div className="rounded-2xl bg-black/15 p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <h3 className="text-[14px] font-semibold text-text">Clear the board</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Deletes jobs matching the scope below. This can't be undone.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={clearScope}
              onChange={(e) => {
                setClearScope(e.target.value);
                setConfirmClear(false);
              }}
              className="field-input w-auto py-2 text-[13px]"
            >
              <option value="rejected">Rejected jobs</option>
              <option value="ignored">Ignored jobs</option>
              <option value="stale">Stale, untouched 30+ days</option>
              <option value="all">Everything</option>
            </select>
            <button
              onClick={handleClear}
              disabled={clearing}
              className={`btn btn-sm disabled:opacity-50 ${
                confirmClear ? 'bg-danger text-[#2A0E0B]' : 'btn-ghost text-danger'
              }`}
            >
              {clearing ? 'Clearing…' : confirmClear ? 'Confirm delete' : 'Clear'}
            </button>
            {confirmClear && (
              <button onClick={() => setConfirmClear(false)} className="text-[12px] text-muted hover:text-text">
                Cancel
              </button>
            )}
          </div>
          {clearResult && <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{clearResult}</p>}
        </div>

        <div className="rounded-2xl bg-black/15 p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <h3 className="text-[14px] font-semibold text-text">Test the daily digest</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Sends one digest to your email right now, regardless of the toggle above. Needs RESEND_API_KEY set on
            the server.
          </p>
          <button
            onClick={handleTestDigest}
            disabled={testingDigest}
            className="btn btn-ghost btn-sm mt-3 disabled:opacity-50"
          >
            {testingDigest ? 'Sending…' : 'Send test digest'}
          </button>
          {digestResult && <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{digestResult}</p>}
        </div>

        <div className="rounded-2xl bg-black/15 p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <h3 className="text-[14px] font-semibold text-text">Export your data</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Downloads your profile, jobs, kits and history as one JSON file.
          </p>
          <a href="/api/export" className="btn btn-ghost btn-sm mt-3">
            Export as JSON
          </a>
        </div>
      </div>
    </section>
  );
}
