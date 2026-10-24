'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Brand from '@/components/Brand';
import ContourField from '@/components/ContourField';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetNote, setResetNote] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('busy');
    setErrorMessage(null);
    setResetNote(null);
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

  function switchMode(next: 'signin' | 'signup') {
    setMode(next);
    setErrorMessage(null);
    setResetNote(null);
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <section className="relative flex min-h-[46vh] flex-col overflow-hidden bg-[radial-gradient(120%_90%_at_20%_100%,#14392B_0,#0E2A1F_70%)] px-6 py-7 sm:px-8 sm:py-9 lg:min-h-0 lg:px-10 lg:py-10 xl:px-[52px]">
          <ContourField className="pointer-events-none absolute inset-0 h-full w-full" />

          <div className="relative z-10 flex flex-1 flex-col">
            <Brand />

            <div className="my-auto max-w-[680px] py-10 lg:py-12">
              <p className="eyebrow mb-5">Your role landscape</p>
              <h1 className="font-display text-[clamp(42px,4.8vw,72px)] font-semibold leading-[1.03] tracking-[-0.035em] text-text">
                Search less.
                <br />
                Apply with intent.
              </h1>
              <p className="mt-5 max-w-[44ch] text-[17px] leading-[1.6] text-[#CFE3D3] sm:text-[18px]">
                RoleSearchHQ scores every role against your profile, shows you why it fits and drafts the kit.
                Nothing sends until you approve it.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted">
              <span className="inline-flex items-center gap-2">
                <Check size={14} className="text-water" aria-hidden="true" /> Scored, not guessed
              </span>
              <span className="inline-flex items-center gap-2">
                <Check size={14} className="text-water" aria-hidden="true" /> You approve every send
              </span>
            </div>
          </div>
        </section>

        <section className="relative flex min-w-0 items-center justify-center px-5 py-10 sm:px-8 sm:py-14 lg:border-l lg:border-border/70 lg:px-10">
          <div className="w-full max-w-[420px]">
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-[18px] rounded-[30px] bg-surface p-7 shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_30px_60px_-30px_rgba(0,0,0,.65)] sm:p-9"
            >
              <div>
                <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-text">
                  {mode === 'signin' ? 'Welcome back' : 'Make yourself at home'}
                </h2>
                <p className="mt-2 text-[15px] text-muted">
                  {mode === 'signin'
                    ? 'Sign in to see what to apply for today.'
                    : 'One private desk for your whole search.'}
                </p>
              </div>

              <div className="grid grid-cols-2 rounded-full bg-black/25 p-1" role="group" aria-label="Account mode">
                <button
                  type="button"
                  aria-pressed={mode === 'signin'}
                  onClick={() => switchMode('signin')}
                  className={`rounded-full px-3 py-2.5 text-[14.5px] font-semibold transition-colors ${
                    mode === 'signin'
                      ? 'bg-surface2 text-text shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_4px_10px_-6px_rgba(0,0,0,.65)]'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  className={`rounded-full px-3 py-2.5 text-[14.5px] font-semibold transition-colors ${
                    mode === 'signup'
                      ? 'bg-surface2 text-text shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_4px_10px_-6px_rgba(0,0,0,.65)]'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Create account
                </button>
              </div>

              <label htmlFor="login-email" className="field-label">
                Email
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                />
              </label>

              <label htmlFor="login-password" className="field-label">
                Password
                <span className="relative block">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input pr-[88px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute bottom-[7px] right-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-accent transition-colors hover:bg-accent/10"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>

              <button type="submit" disabled={status === 'busy'} className="btn btn-primary w-full py-4 disabled:opacity-50">
                {status === 'busy'
                  ? mode === 'signup'
                    ? 'Creating account…'
                    : 'Signing in…'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Sign in'
                }
              </button>

              {status === 'error' && errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
                >
                  {errorMessage}
                </p>
              )}
              {resetNote && (
                <p
                  aria-live="polite"
                  className="rounded-xl border border-water/25 bg-water/10 px-3.5 py-2.5 text-sm text-water"
                >
                  {resetNote}
                </p>
              )}

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgot}
                  className="self-center text-[13px] font-medium text-muted underline decoration-muted/30 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent/40"
                >
                  Forgot your password?
                </button>
              )}

              <p className="text-center text-[12px] leading-relaxed text-muted/80">
                By signing in you agree to the{' '}
                <Link href="/terms" className="text-text/80 underline underline-offset-2">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-text/80 underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
