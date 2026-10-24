'use client';

import { useState } from 'react';

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Couldn't delete the account (${res.status}).`);
        setBusy(false);
        return;
      }
      window.location.href = '/login';
    } catch {
      setError('Network error, nothing was deleted. Try again.');
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border-t border-danger/20 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger/80">Your data</p>
      <h2 className="mt-2 font-display text-[22px] font-semibold text-text">Leave when you want</h2>
      <p className="mt-2 max-w-[64ch] text-[13px] leading-relaxed text-muted">
        Export everything as JSON from the maintenance panel above at any time. Deleting your account permanently
        removes your profile, CV, jobs, kits and history. This can't be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-ghost btn-sm mt-4 text-danger"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 max-w-md rounded-2xl border border-danger/35 bg-danger/[0.04] p-4">
          <label className="mb-2 block text-[12px] font-semibold text-muted" htmlFor="delete-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field-input mb-3 text-[14px]"
            autoComplete="off"
          />
          {error && <p className="mb-3 text-[12px] text-danger">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || text !== 'DELETE'}
              onClick={handleDelete}
              className="btn btn-sm bg-danger text-[#2A0E0B] font-semibold disabled:opacity-40"
            >
              {busy ? 'Deleting...' : 'Permanently delete'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setText('');
                setError(null);
              }}
              className="px-3 py-2 text-[13px] text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
