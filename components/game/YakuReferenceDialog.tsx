'use client';

import { useMemo, useState } from 'react';
import { YAKU_REFERENCE_ENTRIES, YakuReferenceEntry } from '@/lib/yakuEncyclopedia';

interface YakuReferenceDialogProps {
  open: boolean;
  initialYakuId?: string | null;
  onClose: () => void;
}

function hanLabel(entry: YakuReferenceEntry): string {
  if (entry.hanClosed === 'yakuman') {
    return 'Yakuman';
  }
  if (entry.hanOpen === null) {
    return `${entry.hanClosed} han (closed only)`;
  }
  if (entry.hanClosed === entry.hanOpen) {
    return `${entry.hanClosed} han`;
  }
  return `${entry.hanClosed} closed / ${entry.hanOpen} open`;
}

function yakuTone(entry: YakuReferenceEntry): string {
  if (entry.hanClosed === 'yakuman') {
    return 'border-red-500/30 bg-red-500/10 text-red-100';
  }
  const han = typeof entry.hanClosed === 'number' ? entry.hanClosed : 0;
  if (han >= 6) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  }
  if (han >= 3) {
    return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100';
  }
  if (han >= 2) {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  }
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

export function YakuReferenceDialog({
  open,
  initialYakuId = null,
  onClose,
}: YakuReferenceDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialYakuId ?? YAKU_REFERENCE_ENTRIES[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return YAKU_REFERENCE_ENTRIES;
    }
    return YAKU_REFERENCE_ENTRIES.filter(entry =>
      [entry.name, entry.japaneseName, entry.description]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  const selected =
    filtered.find(entry => entry.id === selectedId) ??
    YAKU_REFERENCE_ENTRIES.find(entry => entry.id === selectedId) ??
    filtered[0] ??
    null;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/70 backdrop-blur-sm md:items-center">
      <button type="button" onClick={onClose} aria-label="Close yaku reference" className="absolute inset-0" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.75rem] border border-gray-800 bg-gray-900 shadow-2xl md:max-h-[82vh] md:rounded-[1.75rem]">
        <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-700 md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
                Yaku Reference
              </h3>
              <p className="text-sm text-gray-400">Search every implemented yaku and bonus item.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300"
            >
              Close
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search yaku"
            className="mt-3 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="overflow-y-auto border-b border-gray-800 p-4 md:border-b-0 md:border-r">
            <div className="space-y-2">
              {filtered.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left transition-colors ${
                    selected?.id === entry.id
                      ? `${yakuTone(entry)}`
                      : 'border-gray-800 bg-gray-950/60 text-gray-200'
                  }`}
                >
                  <p className="text-sm font-semibold">{entry.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{hanLabel(entry)}</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-500">No yaku matched your search.</p>
              )}
            </div>
          </div>

          <div className="overflow-y-auto p-4">
            {selected ? (
              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 ${yakuTone(selected)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black text-white">{selected.name}</p>
                      <p className="mt-1 text-sm text-white/70">{selected.japaneseName}</p>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
                      {hanLabel(selected)}
                    </span>
                  </div>
                </div>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Description</h4>
                  <p className="text-sm text-white">{selected.description}</p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Open / Closed</h4>
                  <p className="text-sm text-white">
                    {selected.hanOpen === null
                      ? 'Closed only.'
                      : selected.hanClosed === selected.hanOpen
                      ? 'Open or closed.'
                      : `Closed: ${selected.hanClosed} han. Open: ${selected.hanOpen} han.`}
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Requirements</h4>
                  <div className="space-y-1">
                    {selected.requirements.map(requirement => (
                      <p key={requirement} className="text-sm text-white">
                        {requirement}
                      </p>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Example Hand</h4>
                  <p className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 font-mono text-sm text-cyan-100">
                    {selected.example}
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Strategy Notes</h4>
                  <div className="space-y-1">
                    {selected.strategyTips.map(tip => (
                      <p key={tip} className="text-sm text-white">
                        {tip}
                      </p>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Choose a yaku to view its details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
