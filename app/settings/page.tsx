import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/SettingsForm';
import MaintenancePanel from '@/components/MaintenancePanel';
import DeleteAccount from '@/components/DeleteAccount';
import AccountBar from '@/components/AccountBar';
import Link from 'next/link';
import type { Metadata } from 'next';
import { canSendDigestTo } from '@/lib/digest-config';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect('/login');

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: profile }, { data: recentRejections }] = await Promise.all([
    supabase
      .from('profile')
      .select('name, email, phone, location, portfolio_url, linkedin_url, work_auth_notes, target_titles, exclude_companies, locations, must_haves, deal_breakers, min_match, languages, seniority, comp_floor, master_cv_text, voice_guide, proof_points, notify_digest')
      .eq('id', userId)
      .single(),
    supabase
      .from('rejections')
      .select('reason, term, created_at')
      .eq('user_id', userId)
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false }),
  ]);

  const digestAvailable = canSendDigestTo(profile?.email);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <p className="eyebrow">The matcher's brain</p>
        <h1 className="mt-2 font-display text-[clamp(38px,4.4vw,56px)] font-semibold leading-[0.98] tracking-[-0.04em] text-text">
          Settings
        </h1>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          Who you are, what you're looking for, and the master CV behind every score. Changes take effect on the
          next scan.
        </p>
      </header>

      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-water" aria-hidden="true" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Account</h2>
        </div>
        <AccountBar />
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted/80">
          Your jobs and progress follow this email to every device. Sign in with the same email on each one.
        </p>
      </section>

      <div className="mt-10">
        <SettingsForm profile={profile} userId={userId as string} digestAvailable={digestAvailable} />
      </div>

      {recentRejections && recentRejections.length > 0 && (
        <section className="mt-10 border-t border-border pt-8">
          <p className="eyebrow">Recent teaching</p>
          <h2 className="mt-2 font-display text-[22px] font-semibold text-text">What we learned from your skips</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Rejections from the last 14 days, softly downranking similar roles. Expires on its own.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {recentRejections.map((r, i) => (
              <li
                key={i}
                className="rounded-xl bg-surface px-3.5 py-2.5 text-[12.5px] text-muted"
                style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
              >
                <span className="font-semibold text-text">{r.reason}</span>: downranking roles mentioning “{r.term}”
              </li>
            ))}
          </ul>
        </section>
      )}

      <MaintenancePanel digestAvailable={digestAvailable} />
      <DeleteAccount />

      <p className="mt-8 text-[12px] text-muted/80">
        <Link href="/privacy" className="underline decoration-muted/40 underline-offset-4 hover:text-text">
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" className="underline decoration-muted/40 underline-offset-4 hover:text-text">
          Terms
        </Link>
      </p>
    </div>
  );
}
