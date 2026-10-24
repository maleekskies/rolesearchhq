'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Brand from '@/components/Brand';
import ContourField from '@/components/ContourField';

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg px-4 py-6 sm:px-8">
      <ContourField className="pointer-events-none absolute inset-0 h-full w-full opacity-65" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Brand />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to sign in
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[440px] rounded-[30px] bg-surface p-7 shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_30px_60px_-30px_rgba(0,0,0,.7)] sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
            <KeyRound size={20} aria-hidden="true" />
          </div>
          <p className="eyebrow mt-5">Account recovery</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-text">
            Choose a new password
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            You&apos;ll stay signed in to the same account, with all your jobs and progress.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label htmlFor="new-password" className="field-label">
              New password
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
              />
            </label>
            <label htmlFor="confirm-password" className="field-label">
              Repeat new password
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="Type it once more"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field-input"
              />
            </label>

            <button type="submit" disabled={busy} className="btn btn-primary mt-1 w-full py-4 disabled:opacity-50">
              {busy ? 'Saving…' : 'Save new password'}
            </button>

            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>

      <p className="relative z-10 text-center text-[11px] text-muted/70">
        RoleSearchHQ · your data stays yours
      </p>
    </div>
  );
}
