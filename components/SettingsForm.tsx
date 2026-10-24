'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ChipInput from './ChipInput';

interface Profile {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  work_auth_notes?: string;
  target_titles?: string[];
  exclude_companies?: string[];
  locations?: string[];
  must_haves?: string[];
  deal_breakers?: string[];
  min_match?: number;
  languages?: string[];
  seniority?: string;
  comp_floor?: string;
  master_cv_text?: string;
  voice_guide?: string;
  proof_points?: string;
  notify_digest?: boolean;
}

const SENIORITY_OPTIONS = ['', 'junior', 'mid', 'senior', 'lead'];

export default function SettingsForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? '');
  const [workAuthNotes, setWorkAuthNotes] = useState(profile?.work_auth_notes ?? '');
  const [targetTitles, setTargetTitles] = useState<string[]>(profile?.target_titles ?? []);
  const [excludeCompaniesText, setExcludeCompaniesText] = useState(
    (profile?.exclude_companies ?? []).join(', ')
  );
  const [locations, setLocations] = useState<string[]>(profile?.locations ?? []);
  const [mustHaves, setMustHaves] = useState<string[]>(profile?.must_haves ?? []);
  const [dealBreakers, setDealBreakers] = useState<string[]>(profile?.deal_breakers ?? []);
  const [minMatch, setMinMatch] = useState(profile?.min_match ?? 70);
  const [languages, setLanguages] = useState<string[]>(
    profile?.languages?.length ? profile.languages : ['English']
  );
  const [seniority, setSeniority] = useState(profile?.seniority ?? '');
  const [compFloor, setCompFloor] = useState(profile?.comp_floor ?? '');
  const [masterCvText, setMasterCvText] = useState(profile?.master_cv_text ?? '');
  const [voiceGuide, setVoiceGuide] = useState(profile?.voice_guide ?? '');
  const [proofPoints, setProofPoints] = useState(profile?.proof_points ?? '');
  const [notifyDigest, setNotifyDigest] = useState(profile?.notify_digest ?? false);

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('uploading');
    setUploadError(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/profile/parse-cv', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setUploadStatus('error');
        setUploadError(data.error ?? 'Upload failed');
        return;
      }
      setMasterCvText(data.text);
      setUploadStatus('idle');
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err instanceof Error ? err.message : 'Upload request failed to complete.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      name,
      email,
      phone,
      location,
      portfolio_url: portfolioUrl,
      linkedin_url: linkedinUrl,
      work_auth_notes: workAuthNotes,
      target_titles: targetTitles,
      exclude_companies: excludeCompaniesText.split(',').map((t) => t.trim()).filter(Boolean),
      locations,
      must_haves: mustHaves,
      deal_breakers: dealBreakers,
      min_match: minMatch,
      languages,
      seniority: seniority || null,
      comp_floor: compFloor || null,
      master_cv_text: masterCvText,
      voice_guide: voiceGuide,
      proof_points: proofPoints,
      notify_digest: notifyDigest,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('saved');
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-8">
      <Section
        eyebrow="About you"
        title="Who the matcher is reading for"
        description="These details feed the forms and the voice of your kit."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <LabeledInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <LabeledInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <LabeledInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <LabeledInput label="Portfolio URL" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
          <LabeledInput label="LinkedIn URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </div>
        <div className="mt-4">
          <LabeledInput
            label="Work authorization notes"
            value={workAuthNotes}
            onChange={(e) => setWorkAuthNotes(e.target.value)}
          />
        </div>
      </Section>

      <Section
        eyebrow="The search"
        title="What earns a place on the map"
        description="Titles and places drive the scan. Must-haves and deal-breakers sharpen the score."
      >
        <div className="flex flex-col gap-5">
          <Field label="Target titles" hint="Drives both scanning and scoring.">
            <ChipInput values={targetTitles} onChange={setTargetTitles} placeholder="Add a title" />
          </Field>

          <Field label="Locations" hint="Remote, cities, regions you'll take a role in.">
            <ChipInput values={locations} onChange={setLocations} placeholder="Remote, Lagos, EU..." />
          </Field>

          <Field
            label="Languages I speak"
            hint="Listings that require any other language (fluent German, French-speaking, written in Spanish...) are dropped. 'A plus' mentions only lower the score."
          >
            <ChipInput values={languages} onChange={setLanguages} placeholder="English, Yoruba..." />
          </Field>

          <Field label="Must-haves" hint='"Web3 or AI" means either word is enough; "Web3 and AI" needs both.'>
            <ChipInput values={mustHaves} onChange={setMustHaves} placeholder="e.g. Web3 or AI" />
          </Field>

          <Field label="Deal-breakers" hint="A role mentioning any of these is excluded, not just downranked.">
            <ChipInput values={dealBreakers} onChange={setDealBreakers} placeholder="e.g. unpaid ambassador-only" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[13.5px] font-semibold text-muted">Min match cutoff</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minMatch}
                onChange={(e) => setMinMatch(Number(e.target.value))}
                className="field-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13.5px] font-semibold text-muted">Seniority band</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="field-input"
              >
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s || 'Not set'}
                  </option>
                ))}
              </select>
            </div>
            <LabeledInput
              label="Comp floor (optional)"
              value={compFloor}
              onChange={(e) => setCompFloor(e.target.value)}
            />
          </div>

          <Field
            label="Excluded companies"
            hint="Comma-separated. Never shown, even if they would match."
          >
            <input
              className="field-input"
              placeholder="e.g. a former employer, a company you've already tried"
              value={excludeCompaniesText}
              onChange={(e) => setExcludeCompaniesText(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section
        eyebrow="The raw material"
        title="The CV and voice behind every kit"
        description="Every generated kit pulls only from this. Specifics beat adjectives."
      >
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="text-[13.5px] font-semibold text-muted">Master CV (paste full text, or upload a PDF)</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="cv-upload"
              />
              <label htmlFor="cv-upload" className="btn btn-ghost btn-sm cursor-pointer text-[12px]">
                {uploadStatus === 'uploading' ? 'Extracting text…' : 'Upload PDF'}
              </label>
            </div>
          </div>
          {uploadStatus === 'error' && uploadError && <p className="mb-2 text-xs text-danger">{uploadError}</p>}
          <textarea
            rows={14}
            value={masterCvText}
            onChange={(e) => setMasterCvText(e.target.value)}
            placeholder="Paste your CV text here, or upload a PDF above. Every generated kit pulls only from this."
            className="field-input resize-y font-mono text-[13px] leading-relaxed"
          />
        </div>

        <div className="mt-5">
          <Field label="Voice guide" hint="How you actually sound. Feeds every generated cover letter.">
            <textarea
              rows={3}
              value={voiceGuide}
              onChange={(e) => setVoiceGuide(e.target.value)}
              placeholder="e.g. Human, plain, specific. No corporate filler, no clichés."
              className="field-input resize-y text-[14px] leading-relaxed"
            />
          </Field>
        </div>

        <div className="mt-5">
          <Field
            label="Proof points / STAR stories"
            hint="Real wins, in your own words. Cover letters draw on this for specifics beyond the CV."
          >
            <textarea
              rows={6}
              value={proofPoints}
              onChange={(e) => setProofPoints(e.target.value)}
              placeholder="One per line or paragraph: a project you shipped, a number you moved, a problem you solved."
              className="field-input resize-y text-[14px] leading-relaxed"
            />
          </Field>
        </div>
      </Section>

      <Section eyebrow="Notifications" title="A quieter inbox" description="Optional. The digest goes to your account email.">
        <label className="flex items-center justify-between gap-5 rounded-2xl bg-black/20 px-4 py-3.5" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
          <span>
            <span className="block text-[14px] font-semibold text-text">Daily digest of new matches</span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
              One short email when new roles clear your cutoff.
            </span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              checked={notifyDigest}
              onChange={(e) => setNotifyDigest(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-white/10 transition-colors peer-checked:bg-accent after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-muted after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-accentInk" />
          </span>
        </label>
      </Section>

      <div className="sticky bottom-20 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-bg/90 px-3 py-3 backdrop-blur-md lg:bottom-3">
        <button type="submit" disabled={status === 'saving'} className="btn btn-primary btn-sm disabled:opacity-50">
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span className="text-sm text-good">Saved.</span>}
        {status === 'error' && errorMessage && <span className="text-sm text-danger">{errorMessage}</span>}
        <span className="ml-auto hidden text-[11px] text-muted/70 sm:inline">Changes apply on the next scan.</span>
      </div>
    </form>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] text-text">
        {title}
      </h2>
      <p className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13.5px] font-semibold text-muted">{label}</label>
      {hint && <p className="mb-2 text-[12px] leading-relaxed text-muted/75">{hint}</p>}
      {children}
    </div>
  );
}

function LabeledInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-[13.5px] font-semibold text-muted">{label}</label>
      <input className="field-input" {...props} />
    </div>
  );
}
