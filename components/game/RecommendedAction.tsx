'use client';

import { GameConfig, Meld, Tile, WindValue, OpponentDiscardEvent } from '@/lib/types';
import { analyzeGameHand, HandAnalysis } from '@/lib/handAdvisor';

interface RecommendedActionProps {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  config: GameConfig;
  isRiichi: boolean;
  isTsumo: boolean;
  lastOpponentDiscard: OpponentDiscardEvent | null;
  analysis?: HandAnalysis;
  compact?: boolean;
  focusMode?: boolean;
}

function formatYakuName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatModeName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function RecommendedAction({
  hand,
  melds,
  seatWind,
  config,
  isRiichi,
  isTsumo,
  lastOpponentDiscard,
  analysis: providedAnalysis,
  compact = false,
  focusMode = false,
}: RecommendedActionProps) {
  const analysis =
    providedAnalysis ??
    analyzeGameHand(hand, melds, seatWind, config, isRiichi, isTsumo, lastOpponentDiscard);

  const balancedLines = analysis.strategyRecommendations.balanced.explanation;

  return (
    <div className={`relative rounded-[1.25rem] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_38%),linear-gradient(135deg,rgba(10,18,28,0.96),rgba(14,24,36,0.96))] shadow-[0_12px_30px_rgba(0,0,0,0.24)] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Discard: <span className="text-white">{analysis.bestDiscard ?? '—'}</span>
          </span>
          <span className="text-[11px] text-gray-300">Shanten: {analysis.shanten}</span>
          <span className="text-[11px] text-gray-300">Ukeire: {analysis.ukeire}</span>
          <span className="truncate text-[11px] text-amber-100">Target: {analysis.targetYaku}</span>
        </div>
        {!focusMode && (
          <details className="shrink-0">
            <summary className="cursor-pointer list-none rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              Details
            </summary>
            <div className="absolute right-3 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-800 bg-gray-950/95 p-3 shadow-2xl">
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(analysis.strategyRecommendations).map(([mode, recommendation]) => (
                  <div key={mode} className="rounded-xl border border-white/8 bg-white/5 p-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                      {formatModeName(mode)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">{recommendation.discard ?? '—'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2 rounded-xl border border-cyan-400/15 bg-gray-900/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Why</p>
                {balancedLines.length > 0 ? (
                  balancedLines.slice(0, 2).map(line => (
                    <p key={line} className="text-sm text-white/90">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No recommendation available.</p>
                )}
              </div>
              {analysis.possibleYaku.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.possibleYaku.slice(0, 4).map(name => (
                    <span
                      key={name}
                      className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100"
                    >
                      {formatYakuName(name)}
                    </span>
                  ))}
                </div>
              )}
              {analysis.callRecommendation.length > 0 && (
                <div className="mt-3 space-y-1 rounded-xl border border-sky-500/25 bg-sky-500/10 p-2.5">
                  {analysis.callRecommendation.slice(0, 2).map(line => (
                    <p key={line} className="text-[11px] font-medium text-sky-100">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
      {!focusMode && analysis.warnings.length > 0 && (
        <div className="mt-2 space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
          {analysis.warnings.map(warning => (
            <p key={warning} className="text-[11px] text-red-200">
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
