'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Brand from '@/components/Brand';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Brand showTagline />
        </div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          Account recovery
        </p>
        <h1 className="font-display text-3xl text-text mb-2">Choose a new password</h1>
        <p className="text-muted mb-6 text-sm">
          You&apos;ll stay signed in to the same account, with all your jobs and progress.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="new-password" className="sr-only">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface border border-border rounded px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <label htmlFor="confirm-password" className="sr-only">
            Repeat new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-surface border border-border rounded px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="grad-bg text-bg font-medium rounded px-4 py-3 hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Save new password'}
          </button>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
