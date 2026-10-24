import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import OnboardingWizard from '@/components/OnboardingWizard';
import Brand from '@/components/Brand';
import ContourField from '@/components/ContourField';

export const metadata: Metadata = { title: 'Set up your profile' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('onboarded_at')
    .eq('id', user!.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect('/');

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg px-4 py-6 sm:px-8 lg:px-10">
      <ContourField className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Brand showTagline />
        <span className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Private setup
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center py-10 sm:py-14">
        <div
          className="w-full max-w-2xl rounded-[30px] bg-surface/95 p-6 shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_34px_80px_-36px_rgba(0,0,0,.85)] backdrop-blur-sm sm:p-9"
        >
          <OnboardingWizard userId={user!.id} />
        </div>
      </div>

      <p className="relative z-10 text-center text-[11px] leading-relaxed text-muted/75">
        Your CV stays private. It is only used to score roles for this account.
      </p>
    </div>
  );
}
