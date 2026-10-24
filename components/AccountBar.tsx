'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Shows which account this device is signed in as, with a Sign out button.
// Everything in RoleSearchHQ is stored against the account, so two devices only
// show the same jobs and progress if they are signed in as the SAME email.
export default function AccountBar({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  if (!email) return null;

  return (
    <div
      className={`rounded-[18px] bg-black/20 px-3.5 py-3.5 text-[13px] text-muted ${className}`}
      style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
    >
      <b className="mb-0.5 block font-semibold text-text">{email}</b>
      <span>Signed in</span>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="mt-1.5 block font-semibold text-accent underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent disabled:opacity-50"
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
