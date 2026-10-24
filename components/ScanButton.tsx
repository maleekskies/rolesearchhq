'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ScanLine, X } from 'lucide-react';

interface ScanResult {
  found: number;
  inserted: number;
  updated: number;
  dropped?: {
    language: number;
    onsite: number;
    location: number;
    dealBreaker: number;
    lowScore: number;
    excludedCompany: number;
    tooOld: number;
    duplicate: number;
  };
  sourceErrors: string[];
  dbErrors?: string[];
  message?: string;
  error?: string;
}

export default function ScanButton({
  className = '',
}: {
  className?: string;
}) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [open, setOpen] = useState(false);

  async function handleScan() {
    setScanning(true);
    setResult(null);
    setOpen(false);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const body = (await res.json()) as ScanResult;
      setResult(body);
      setOpen(true);
      if (res.ok) router.refresh();
    } catch (err) {
      setResult({
        found: 0,
        inserted: 0,
        updated: 0,
        sourceErrors: [],
        error: err instanceof Error ? err.message : 'Scan request failed to complete.',
      });
      setOpen(true);
    }
    setScanning(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleScan}
        disabled={scanning}
        className={`btn btn-primary btn-sm ${className}`}
      >
        {scanning ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <ScanLine size={16} aria-hidden="true" />
        )}
        {scanning ? 'Scanning…' : 'Scan now'}
      </button>

      {result && open && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-4 z-50 w-[min(390px,calc(100vw-2rem))] rounded-2xl bg-surface2 p-4 text-sm shadow-[inset_0_0_0_1px_rgb(var(--c-border)),0_26px_60px_-24px_rgba(0,0,0,.85)] lg:bottom-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {result.error ? (
                <p className="text-danger">{result.error}</p>
              ) : result.message ? (
                <p className="text-muted">{result.message}</p>
              ) : (
                <>
                  <p className="font-semibold text-text">
                    Scan complete · {result.inserted} new
                  </p>
                  <p className="mt-1 text-muted">
                    Found {result.found}, refreshed {result.updated}.
                  </p>
                  {result.dropped && (
                    <p className="mt-2 text-xs leading-relaxed text-muted/85">
                      Screened out: {result.dropped.lowScore} below cutoff, {result.dropped.language} language,{' '}
                      {result.dropped.onsite} on-site/hybrid, {result.dropped.location} region,{' '}
                      {result.dropped.dealBreaker} deal-breaker, {result.dropped.duplicate} already seen.
                    </p>
                  )}
                  {result.sourceErrors?.length > 0 && (
                    <p className="mt-2 text-xs text-warnInk">
                      {result.sourceErrors.length} board{result.sourceErrors.length > 1 ? 's' : ''} had trouble.
                      The rest still ran.
                    </p>
                  )}
                  {result.dbErrors && result.dbErrors.length > 0 && (
                    <p className="mt-2 text-xs text-danger">
                      Some results could not be saved. Try again in a moment.
                    </p>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full p-1 text-muted hover:bg-white/10 hover:text-text"
              aria-label="Dismiss scan result"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
