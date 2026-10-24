'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Brand from '@/components/Brand';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetNote, setResetNote] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('busy');
    setErrorMessage(null);
    const supabase = createClient();

    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }

    window.location.href = '/';
  }

  async function handleForgot() {
    setResetNote(null);
    setErrorMessage(null);
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setErrorMessage('Type your email above first, then press "Forgot password?".');
      setStatus('error');
      return;
    }
    const { error } = await createClient().auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }
    setStatus('idle');
    setResetNote('If that email has an account, a reset link is on its way. Check your inbox and spam folder.');
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-border px-10 py-12 lg:flex lg:flex-col xl:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#A05CFF]/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 bottom-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          />

          <div className="relative flex flex-1 flex-col">
            <Brand showTagline />

            <div className="my-auto max-w-lg py-12">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                Your job search HQ
              </p>
              <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-text xl:text-6xl">
                Search less.
                <br />
                <span className="grad-text">Apply with intent.</span>
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                RoleSearchHQ scores every role against your profile, shows you why it fits, and drafts the kit.
                Nothing sends until you approve it.
              </p>

              <div aria-hidden="true" className="mt-9 max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold tabular-nums text-accentInk">
                      92
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">Senior Research Analyst</p>
                      <p className="truncate text-xs text-muted">Northstar · Remote</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-tint px-2.5 py-1 text-[11px] font-medium text-accent">
                    Strong
                  </span>
                </div>
                <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted">
                  <p className="flex items-center gap-2">
                    <Check size={13} className="shrink-0 text-accent" /> Matches your target title
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={13} className="shrink-0 text-accent" /> Writing-heavy, as you asked
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={13} className="shrink-0 text-accent" /> Remote-friendly
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-accent" /> Scored, not guessed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-accent" /> You approve every send
              </span>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 items-center justify-center px-6 py-10 sm:py-14 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <Brand showTagline />
            </div>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-text">
              {mode === 'signin' ? 'Sign in to your HQ' : 'Set up your HQ'}
            </h2>
            <p className="mb-6 mt-2 text-muted">
              {mode === 'signin'
                ? 'Roles scored against your profile. Nothing sends until you say so.'
                : 'One desk for your whole search. Start with an email and a password.'}
            </p>

            <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                aria-pressed={mode === 'signin'}
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 rounded py-2 text-sm ${
                  mode === 'signin' ? 'grad-bg font-medium text-bg' : 'text-muted hover:text-text'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === 'signup'}
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 rounded py-2 text-sm ${
                  mode === 'signup' ? 'grad-bg font-medium text-bg' : 'text-muted hover:text-text'
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label htmlFor="login-email" className="sr-only">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-border bg-surface px-4 py-3 text-text placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-border bg-surface px-4 py-3 text-text placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === 'busy'}
                className="grad-bg rounded px-4 py-3 font-medium text-bg transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {status === 'busy'
                  ? mode === 'signup'
                    ? 'Creating account…'
                    : 'Signing in…'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Sign in'}
              </button>
              {status === 'error' && errorMessage && (
                <p role="alert" className="text-sm text-danger">
                  {errorMessage}
                </p>
              )}
              {resetNote && (
                <p aria-live="polite" className="text-sm text-good">
                  {resetNote}
                </p>
              )}
              {mode === 'signin' && (
                <button type="button" onClick={handleForgot} className="self-start text-xs text-muted underline">
                  Forgot password?
                </button>
              )}
            </form>

            <div className="mt-8 border-t border-border pt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                What happens next
              </p>
              <ol className="grid gap-2 text-sm text-muted">
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">01</span>
                  <span>Set target titles and must-haves.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">02</span>
                  <span>Today fills with roles scored against your profile.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">03</span>
                  <span>Review a kit, then apply yourself.</span>
                </li>
              </ol>
            </div>

            <p className="mt-8 text-center text-xs text-muted">
              Your private job-search HQ. Not a job board. By signing in you agree to the{' '}
              <Link href="/terms" className="underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
