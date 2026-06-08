'use client';

import { useMemo } from 'react';
import { GameConfig, Meld, Tile, WindValue } from '@/lib/types';
import { analyzeGameHand } from '@/lib/handAdvisor';

interface RecommendedActionProps {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  config: GameConfig;
  isRiichi: boolean;
  isTsumo: boolean;
}

function formatYakuName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function RecommendedAction({
  hand,
  melds,
  seatWind,
  config,
  isRiichi,
  isTsumo,
}: RecommendedActionProps) {
  const analysis = useMemo(
    () => analyzeGameHand(hand, melds, seatWind, config, isRiichi, isTsumo),
    [hand, melds, seatWind, config, isRiichi, isTsumo]
  );

  return (
    <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-gray-800 to-gray-900 p-4 sm:space-y-5 sm:p-5">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Strategy Advisor
        </h3>
        <p className="text-sm text-gray-400">Deterministic hand guidance from the current state.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Current Shanten</p>
          <p className="mt-1 text-2xl font-bold text-white">{analysis.shanten}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Current Ukeire</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{analysis.ukeire}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-gray-500">Possible Yaku</p>
        {analysis.possibleYaku.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {analysis.possibleYaku.map(name => (
              <span
                key={name}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200"
              >
                {formatYakuName(name)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No immediate yaku line detected.</p>
        )}
      </div>

      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
        <p className="text-[11px] uppercase tracking-wider text-amber-200/80">Target Yaku</p>
        <p className="mt-1 text-sm font-semibold text-amber-100">{analysis.targetYaku}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Best Discard</p>
          <p className="mt-1 text-xl font-bold text-rose-300">{analysis.bestDiscard ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3 sm:col-span-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Alternative</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {analysis.alternatives.length > 0 ? analysis.alternatives.join('  ') : '—'}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800/70 p-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-500">Recommendation</p>
        {analysis.recommendation.length > 0 ? (
          analysis.recommendation.map(line => (
            <p key={line} className="text-sm font-medium text-white">
              {line}
            </p>
          ))
        ) : (
          <p className="text-sm text-gray-500">No recommendation available.</p>
        )}
      </div>

      {analysis.warnings.length > 0 && (
        <div className="space-y-1 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          {analysis.warnings.map(warning => (
            <p key={warning} className="text-sm text-red-200">
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
