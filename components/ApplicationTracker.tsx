'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { readJobCrm, withJobCrm } from '@/lib/job-crm';
import type { Job } from '@/lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ApplicationTracker({ job }: { job: Job }) {
  const router = useRouter();
  const initial = readJobCrm(job.raw_json);
  const [appliedAt, setAppliedAt] = useState(initial.appliedAt ?? '');
  const [salary, setSalary] = useState(initial.salary ?? '');
  const [contact, setContact] = useState(initial.contact ?? '');
  const [deadline, setDeadline] = useState(initial.deadline ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaveState('saving');
    setError(null);
    const supabase = createClient();
    const rawJson = withJobCrm(job.raw_json, {
      appliedAt: appliedAt || null,
      salary: salary.trim() || null,
      contact: contact.trim() || null,
      deadline: deadline || null,
    });
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ raw_json: rawJson, updated_at: new Date().toISOString() })
      .eq('id', job.id);

    if (updateError) {
      setSaveState('error');
      setError(updateError.message);
      return;
    }

    setSaveState('saved');
    router.refresh();
    setTimeout(() => setSaveState('idle'), 1800);
  }

  return (
    <section className="rounded-2xl bg-surface p-4" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}>
      <h2 className="font-display text-[16px] font-semibold text-text">Application details</h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
        Keep the practical details together. Only you can see them.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          Applied on
          <input
            type="date"
            value={appliedAt}
            onChange={(event) => setAppliedAt(event.target.value)}
            className="field-input py-2 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          Salary
          <input
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
            placeholder="e.g. $85k–$95k"
            className="field-input py-2 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          Contact
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Name, email or recruiter"
            className="field-input py-2 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          Decision deadline
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="field-input py-2 text-[13px]"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="btn btn-ghost btn-sm disabled:opacity-50"
        >
          {saveState === 'saved' ? (
            <>
              <Check size={14} aria-hidden="true" /> Saved
            </>
          ) : saveState === 'saving' ? (
            'Saving…'
          ) : (
            'Save details'
          )}
        </button>
        {error && <span className="text-[11px] text-danger">{error}</span>}
      </div>
    </section>
  );
}
