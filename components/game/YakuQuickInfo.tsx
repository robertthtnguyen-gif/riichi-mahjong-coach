'use client';

import { YakuReferenceEntry } from '@/lib/yakuEncyclopedia';

interface YakuQuickInfoProps {
  entry: YakuReferenceEntry | null;
  open: boolean;
  onClose: () => void;
}

function hanLabel(entry: YakuReferenceEntry): string {
  if (entry.hanClosed === 'yakuman') {
    return 'Yakuman';
  }
  if (entry.hanOpen === null) {
    return `${entry.hanClosed} han, closed only`;
  }
  if (entry.hanClosed === entry.hanOpen) {
    return `${entry.hanClosed} han open or closed`;
  }
  return `${entry.hanClosed} closed / ${entry.hanOpen} open`;
}

export function YakuQuickInfo({ entry, open, onClose }: YakuQuickInfoProps) {
  if (!open || !entry) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-gray-950/60 backdrop-blur-sm md:items-center">
      <button type="button" onClick={onClose} aria-label="Close yaku info" className="absolute inset-0" />
      <div className="relative z-10 w-full max-w-sm rounded-t-[1.5rem] border border-gray-800 bg-gray-900 p-4 shadow-2xl md:rounded-[1.5rem]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-700 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">{entry.name}</h3>
            <p className="text-sm text-gray-400">{entry.japaneseName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300"
          >
            Close
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold text-cyan-100">{hanLabel(entry)}</p>
        <p className="mt-2 text-sm text-white">{entry.description}</p>
      </div>
    </div>
  );
}
