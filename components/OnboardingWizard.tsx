'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ChipInput from './ChipInput';

const TOTAL_STEPS = 4;
const STEP_LABELS = ['Targets', 'Places', 'Filters', 'Experience'];

const TITLE_SUGGESTIONS = ['Senior Research Analyst', 'Community Lead', 'AI Content Strategist'];
const LOCATION_SUGGESTIONS = ['Remote', 'Lagos', 'EU', 'US', 'On-site'];
const MUST_HAVE_SUGGESTIONS = ['Web3 or AI', 'Writing-heavy', 'Paid role'];
const DEAL_BREAKER_SUGGESTIONS = ['Unpaid ambassador-only', 'No writing sample', 'Relocation required'];

export default function OnboardingWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('');
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [masterCvText, setMasterCvText] = useState('');
  const [wins, setWins] = useState('');

  const canAdvance =
    (step === 1 && targetTitles.length >= 2) ||
    (step === 2 && locations.length >= 1) ||
    step === 3 ||
    (step === 4 && masterCvText.trim().length > 0);

  async function handleFinish() {
    setSaving(true);
    setErrorMessage(null);
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      target_titles: targetTitles,
      locations,
      timezone: timezone || null,
      must_haves: mustHaves,
      deal_breakers: dealBreakers,
      master_cv_text: masterCvText,
      wins: wins || null,
      min_match: 70,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setSaving(false);
      setErrorMessage(error.message);
      return;
    }

    router.push('/?first_run=1');
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Set up your profile</p>
          <p className="mt-2 text-[13.5px] text-muted">
            Step {step} of {TOTAL_STEPS} · {STEP_LABELS[step - 1]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index < step ? 'w-7 bg-accent' : 'w-4 bg-white/10'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <StepShell
          title="What roles are you targeting?"
          hint="Add 2 to 5 titles. This is the shape of the map we'll build for you."
        >
          <ChipInput
            values={targetTitles}
            onChange={setTargetTitles}
            suggestions={TITLE_SUGGESTIONS}
            placeholder="Type a title and press Enter"
          />
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title="Where can you work?" hint="Pick as many as apply. Remote counts as a place.">
          <ChipInput
            values={locations}
            onChange={setLocations}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder="Remote, Lagos, EU..."
          />
          <label className="field-label mt-5">
            Timezone <span className="font-normal text-muted/60">(optional)</span>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. WAT (UTC+1)"
              className="field-input"
            />
          </label>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell
          title="Must-haves and deal-breakers"
          hint="Both are optional, but they sharpen the match a lot."
        >
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Must-haves</p>
          <ChipInput
            values={mustHaves}
            onChange={setMustHaves}
            suggestions={MUST_HAVE_SUGGESTIONS}
            placeholder="e.g. Web3 or AI"
          />
          <p className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Deal-breakers</p>
          <ChipInput
            values={dealBreakers}
            onChange={setDealBreakers}
            suggestions={DEAL_BREAKER_SUGGESTIONS}
            placeholder="e.g. unpaid ambassador-only"
          />
        </StepShell>
      )}

      {step === 4 && (
        <StepShell
          title="Paste the raw material"
          hint="This is what the matcher reads. You can edit it later in Settings."
        >
          <label className="field-label">
            CV or profile text
            <textarea
              rows={10}
              value={masterCvText}
              onChange={(e) => setMasterCvText(e.target.value)}
              placeholder="Paste your CV or LinkedIn about section"
              className="field-input resize-y font-mono text-[13px] leading-relaxed"
            />
          </label>
          <label className="field-label mt-4">
            Three wins <span className="font-normal text-muted/60">(optional)</span>
            <textarea
              rows={3}
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="Short bullets are perfect"
              className="field-input resize-y text-[14px] leading-relaxed"
            />
          </label>
        </StepShell>
      )}

      {errorMessage && (
        <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            className="btn btn-ghost btn-sm"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((current) => current + 1)}
            disabled={!canAdvance}
            className="btn btn-primary disabled:opacity-40"
          >
            Continue
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canAdvance || saving}
            className="btn btn-primary disabled:opacity-40"
          >
            {saving ? 'Opening your map…' : 'Open my map'}
            {!saving && <Check size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[clamp(26px,3vw,34px)] font-semibold leading-[1.08] tracking-[-0.03em] text-text">
        {title}
      </h1>
      <p className="mb-5 mt-2 text-[14.5px] leading-relaxed text-muted">{hint}</p>
      {children}
    </div>
  );
}
