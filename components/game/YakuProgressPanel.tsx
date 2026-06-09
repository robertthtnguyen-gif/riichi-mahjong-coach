'use client';

import { YakuProgress } from '@/lib/yakuProgress';
import { getYakuReference } from '@/lib/yakuEncyclopedia';

interface YakuProgressPanelProps {
  progress: YakuProgress | null;
}

export function YakuProgressPanel({ progress }: YakuProgressPanelProps) {
  if (!progress) {
    return (
      <div className="rounded-[1.25rem] border border-gray-800 bg-gray-900/90 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Yaku Progress
        </p>
        <p className="mt-2 text-sm text-gray-400">No focused yaku line yet.</p>
      </div>
    );
  }

  const reference = getYakuReference(progress.target);

  return (
    <div className="rounded-[1.25rem] border border-gray-800 bg-gray-900/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Target Yaku</p>
      <p className="mt-1 text-lg font-bold text-white">{reference.name}</p>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Progress</p>
        {progress.steps.map(step => (
          <div key={step.label} className="flex items-center gap-2 text-sm">
            <span className={step.complete ? 'text-emerald-300' : 'text-rose-300'}>
              {step.complete ? '✓' : '✗'}
            </span>
            <span className={step.complete ? 'text-white' : 'text-gray-400'}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
