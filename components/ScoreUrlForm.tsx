'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2 } from 'lucide-react';

export default function ScoreUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/jobs/score-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Request failed to complete.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Link2
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/60"
          aria-hidden="true"
        />
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a job posting URL to score it instantly"
          className="field-input w-full py-2.5 pl-9 text-[13.5px]"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn btn-ghost btn-sm whitespace-nowrap disabled:opacity-50"
      >
        {status === 'loading' ? 'Scoring…' : 'Score this URL'}
      </button>
      {status === 'error' && errorMessage && (
        <p className="text-[12px] text-danger sm:self-center">{errorMessage}</p>
      )}
    </form>
  );
}
