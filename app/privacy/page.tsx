import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy' };

// TEMPLATE: written to match what the app actually does today. Have it
// reviewed against the laws that apply to where you and your users are
// (e.g. NDPR/NDPA in Nigeria, GDPR for EU users) before launch, and set
// NEXT_PUBLIC_CONTACT_EMAIL so people can reach you.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

const linkClass =
  'text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:text-text';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 26, 2026">
      <LegalSection title="What RoleSearchHQ is">
        RoleSearchHQ is a personal job-search tool. It scores public job listings against the profile you enter and
        helps you prepare application material. It never applies to anything on your behalf.
      </LegalSection>

      <LegalSection title="What we collect">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent">
          <li>Your email address, used to create and sign in to your account.</li>
          <li>
            What you enter in your profile: name, phone, location, links, work-authorization notes, target titles,
            preferences, languages, your CV text, voice guide and proof points.
          </li>
          <li>Jobs in your Today list and pipeline, their scores, notes, dates, and the kits you generate.</li>
          <li>Which roles you rejected and why, and simple daily usage counters that enforce fair-use limits.</li>
          <li>
            Aggregated page-view and performance data through Vercel Web Analytics and Speed Insights, such as
            the pages visited, referring page, device and browser type, approximate region, and page load
            timings.
          </li>
        </ul>
        <p className="mt-3">
          We use privacy-friendly, aggregated analytics and performance monitoring from Vercel. Those tools do
          not use cookies, do not receive your CV or profile content, and are not used for advertising or
          cross-site tracking. The only cookies are the ones that keep you signed in.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        To score listings for you, to generate tailored CVs, cover letters and talking points when you open a job,
        and, only if you turn it on, to email you a daily digest of new matches. We do not sell your data and we do
        not use it to train models.
      </LegalSection>

      <LegalSection title="Who else handles your data">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent">
          <li>
            Supabase: stores your account and data (database hosted in Ireland, EU West) and sends account emails
            such as password resets.
          </li>
          <li>Vercel: hosts the app and provides aggregated analytics and performance monitoring.</li>
          <li>
            Groq: when you generate a kit, the relevant parts of your CV, profile and the job description are sent
            to Groq to produce the text. This is the only third party that sees your CV content.
          </li>
          <li>Resend: delivers the optional daily digest, so it sees your email address and the digest content.</li>
        </ul>
        <p className="mt-3">
          Job boards are queried for public listings only. None of your personal data is sent to them or to
          employers.
        </p>
      </LegalSection>

      <LegalSection title="Keeping and deleting your data">
        Your data stays until you delete it. You can export everything as JSON and permanently delete your account,
        including all of your data, from Settings at any time.
      </LegalSection>

      <LegalSection title="Your rights">
        You can access, correct, export and delete your data from within the app. If you want help, or have a
        question or complaint about how your data is handled, contact us
        {CONTACT ? (
          <>
            {' '}at{' '}
            <a className={linkClass} href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          </>
        ) : (
          ' using the contact details of the site operator'
        )}
        .
      </LegalSection>

      <LegalSection title="Changes">
        If this policy changes in a meaningful way, we will update the date above and, for significant changes, tell
        you in the app.
      </LegalSection>

      <p className="border-t border-border pt-6">
        See also the{' '}
        <Link href="/terms" className={linkClass}>
          Terms of Use
        </Link>
        .
      </p>
    </LegalPage>
  );
}
