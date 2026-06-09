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
}: RecommendedActionProps) {
  const analysis =
    providedAnalysis ??
    analyzeGameHand(hand, melds, seatWind, config, isRiichi, isTsumo, lastOpponentDiscard);

  const balancedLines = analysis.strategyRecommendations.balanced.explanation;

  return (
    <div className="space-y-3 rounded-[1.75rem] border border-cyan-500/25 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_42%),linear-gradient(135deg,rgba(10,18,28,0.96),rgba(14,24,36,0.96))] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">
            Live Recommendation
          </h3>
          <p className="text-3xl font-black tracking-tight text-white">
            {analysis.bestDiscard ?? '—'}
          </p>
          <p className="text-sm text-cyan-100/90">
            {analysis.bestDiscard
              ? `Discard ${analysis.bestDiscard} next`
              : 'No discard recommendation yet'}
          </p>
        </div>
        <div className="space-y-2 text-right">
          <div className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">
            Speed: {analysis.bestSpeedDiscard ?? '—'}
          </div>
          <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
            Value: {analysis.bestValueDiscard ?? '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(analysis.strategyRecommendations).map(([mode, recommendation]) => (
          <div key={mode} className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
              {formatModeName(mode)}
            </p>
            <p className="mt-1 text-sm font-bold text-white">{recommendation.discard ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-cyan-400/15 bg-gray-950/35 p-3">
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

      <div className="flex flex-wrap gap-2">
        {analysis.possibleYaku.slice(0, 4).map(name => (
          <span
            key={name}
            className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-100"
          >
            {formatYakuName(name)}
          </span>
        ))}
      </div>

      {analysis.callRecommendation.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3">
          <p className="text-[11px] uppercase tracking-wider text-sky-200/80">Call Advice</p>
          {analysis.callRecommendation.slice(0, 2).map(line => (
            <p key={line} className="text-sm font-medium text-sky-100">
              {line}
            </p>
          ))}
        </div>
      )}

      {analysis.warnings.length > 0 && (
        <div className="space-y-1 rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
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
