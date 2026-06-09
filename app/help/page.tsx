'use client';

import { useMemo, useState } from 'react';
import { AppMenu } from '@/components/app/AppMenu';
import { YAKU_REFERENCE_ENTRIES, YakuReferenceEntry } from '@/lib/yakuEncyclopedia';

function hanBand(entry: YakuReferenceEntry): '1 Han' | '2 Han' | '3 Han' | '6 Han' | 'Yakuman' | 'Bonus' {
  if (entry.hanClosed === 'yakuman') return 'Yakuman';
  if (entry.hanClosed === 6) return '6 Han';
  if (entry.hanClosed === 3) return '3 Han';
  if (entry.hanClosed === 2) return '2 Han';
  if (entry.hanClosed === 1) return '1 Han';
  return 'Bonus';
}

function hanLabel(entry: YakuReferenceEntry): string {
  if (entry.hanClosed === 'yakuman') return 'Yakuman';
  if (entry.hanOpen === null) return `${entry.hanClosed} han (closed only)`;
  if (entry.hanOpen === entry.hanClosed) return `${entry.hanClosed} han`;
  return `${entry.hanClosed} closed / ${entry.hanOpen} open`;
}

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | '1 Han' | '2 Han' | '3 Han' | '6 Han' | 'Yakuman' | 'Bonus'>('All');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return YAKU_REFERENCE_ENTRIES.filter(entry => {
      const matchesFilter = filter === 'All' || hanBand(entry) === filter;
      const haystack = [
        entry.name,
        entry.japaneseName,
        entry.description,
        entry.requirements.join(' '),
        entry.example,
        entry.strategyTips.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <header className="border-b border-cyan-500/10 bg-[#07111b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-6xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">Yaku Help</h1>
              <p className="text-sm text-cyan-100/70">Full encyclopedia, examples, and strategy notes.</p>
            </div>
            <AppMenu />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search yaku, examples, or strategy notes"
              className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {(['All', '1 Han', '2 Han', '3 Han', '6 Han', 'Yakuman', 'Bonus'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                    filter === option
                      ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                      : 'border border-gray-800 bg-gray-900 text-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-screen-6xl gap-4 px-4 py-4 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map(entry => (
          <article key={entry.id} className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{entry.name}</h2>
                <p className="text-sm text-gray-400">{entry.japaneseName}</p>
              </div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {hanLabel(entry)}
              </span>
            </div>
            <p className="mt-4 text-sm text-white">{entry.description}</p>
            <section className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Requirements</h3>
              {entry.requirements.map(requirement => (
                <p key={requirement} className="text-sm text-gray-200">
                  {requirement}
                </p>
              ))}
            </section>
            <section className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Example</h3>
              <p className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 font-mono text-sm text-cyan-100">
                {entry.example}
              </p>
            </section>
            <section className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Strategy Notes</h3>
              {entry.strategyTips.map(tip => (
                <p key={tip} className="text-sm text-gray-200">
                  {tip}
                </p>
              ))}
            </section>
          </article>
        ))}
      </main>
    </div>
  );
}
