'use client';

import { useState } from 'react';

export default function ChipInput({
  values,
  onChange,
  suggestions = [],
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  const unusedSuggestions = suggestions.filter((s) => !values.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-black/20 px-3 py-2.5 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(224,180,90,.14)]">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[13.5px] font-medium text-accent ring-1 ring-inset ring-accent/20"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="leading-none text-accent/65 transition-colors hover:text-accent"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-[14.5px] text-text placeholder:text-muted/60 focus:outline-none"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-white/[0.09] hover:text-text"
              style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--c-border))' }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
