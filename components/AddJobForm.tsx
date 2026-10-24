'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function AddJobForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', company: '', url: '', location: '', description: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { job } = await res.json();
        setOpen(false);
        setForm({ title: '', company: '', url: '', location: '', description: '' });
        router.push(`/jobs/${job.id}`);
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(body.error ?? `Request failed (${res.status}).`);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Request failed to complete.');
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm w-full sm:w-auto">
        <Plus size={15} aria-hidden="true" />
        Add job
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-2xl bg-surface p-4"
      style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Job title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="field-input py-2.5 text-[13.5px]"
        />
        <input
          required
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          className="field-input py-2.5 text-[13.5px]"
        />
      </div>
      <input
        required
        placeholder="Apply URL (LinkedIn link is fine)"
        value={form.url}
        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
        className="field-input py-2.5 text-[13.5px]"
      />
      <input
        placeholder="Location (optional)"
        value={form.location}
        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
        className="field-input py-2.5 text-[13.5px]"
      />
      <textarea
        rows={6}
        placeholder="Paste the full job description here"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="field-input resize-y py-2.5 text-[13.5px] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status === 'saving'} className="btn btn-primary btn-sm disabled:opacity-50">
          {status === 'saving' ? 'Adding…' : 'Add to Today'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-2 py-2 text-[13px] text-muted hover:text-text">
          Cancel
        </button>
        {status === 'error' && errorMessage && <span className="text-[12px] text-danger">{errorMessage}</span>}
      </div>
    </form>
  );
}
