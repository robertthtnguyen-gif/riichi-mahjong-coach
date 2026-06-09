'use client';

import { GameConfig, Meld, OpponentDiscardEvent, Tile, WindValue } from '@/lib/types';
import { analyzeGameHand, HandAnalysis } from '@/lib/handAdvisor';
import { CallRecommendation } from '@/lib/callAdvisor';
import { YakuEntry } from '@/lib/yaku';
import { getFocusModeLayoutConfig } from '@/lib/focusModeLayout';

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
  phaseLabel?: string;
  turnLabel?: string;
  pushFoldStatus?: string;
  callRecommendation?: CallRecommendation | null;
  confirmedYaku?: YakuEntry[];
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
  phaseLabel = 'Awaiting action',
  turnLabel = 'My turn',
  pushFoldStatus = 'Neutral',
  callRecommendation = null,
  confirmedYaku = [],
}: RecommendedActionProps) {
  const analysis =
    providedAnalysis ??
    analyzeGameHand(hand, melds, seatWind, config, isRiichi, isTsumo, lastOpponentDiscard);
  const layout = getFocusModeLayoutConfig(focusMode);
  const balancedLines = analysis.strategyRecommendations.balanced.explanation;

  return (
    <div
      className={`relative rounded-[1.25rem] border bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_38%),linear-gradient(135deg,rgba(10,18,28,0.96),rgba(14,24,36,0.96))] shadow-[0_12px_30px_rgba(0,0,0,0.24)] ${
        focusMode ? 'border-cyan-400/35 p-4' : 'border-cyan-500/20'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          {turnLabel}
        </span>
        <span className="text-xs text-gray-300">{phaseLabel}</span>
        <span className="text-xs text-gray-300">Shanten {analysis.shanten}</span>
        <span className="text-xs text-gray-300">Ukeire {analysis.ukeire}</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
            Best Discard
          </p>
          <p className={`${layout.keyDecisionTextClass} font-black text-white`}>
            {analysis.bestDiscard ?? '—'}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-right">
          <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Target</p>
            <p className="mt-1 text-sm font-semibold text-amber-50">{analysis.targetYaku}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Risk</p>
            <p className="mt-1 text-sm font-semibold text-white">{pushFoldStatus}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/80">Confirmed Yaku</p>
          <p className="mt-1 text-sm font-semibold text-emerald-50">
            {confirmedYaku.length > 0
              ? confirmedYaku.map(entry => formatYakuName(entry.name)).join(', ')
              : 'None yet'}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-sky-100/80">Call Recommendation</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {callRecommendation
              ? `${callRecommendation.action}${callRecommendation.callType ? ` ${callRecommendation.callType}` : ''}`
              : 'Pass'}
          </p>
          {callRecommendation?.reason[0] ? (
            <p className="mt-1 text-xs text-sky-100">{callRecommendation.reason[0]}</p>
          ) : null}
        </div>
      </div>

      {layout.showFullRecommendationDetails ? (
        <details className="mt-3" open>
          <summary className="cursor-pointer list-none rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100">
            Full Recommendation Details
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(analysis.strategyRecommendations).map(([mode, recommendation]) => (
                <div key={mode} className="rounded-xl border border-white/8 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                    {formatModeName(mode)}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">{recommendation.discard ?? '—'}</p>
                  {recommendation.explanation.slice(0, 2).map(line => (
                    <p key={line} className="mt-1 text-xs text-gray-300">
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-cyan-400/15 bg-gray-900/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Why</p>
              {balancedLines.length > 0 ? (
                balancedLines.map(line => (
                  <p key={line} className="text-sm text-white/90">
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recommendation available.</p>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Ukeire Breakdown</p>
                <div className="mt-2 space-y-2">
                  {analysis.discardOptions.slice(0, 4).map(option => (
                    <div
                      key={option.tile}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/5 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{option.tile}</p>
                        <p className="text-xs text-gray-400">{option.waitDescription}</p>
                      </div>
                      <div className="text-right text-xs text-gray-300">
                        <p>Shanten {option.shanten}</p>
                        <p>Ukeire {option.ukeire}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Alternative Discards</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(analysis.alternatives.length > 0 ? analysis.alternatives : ['—']).map(tile => (
                      <span
                        key={tile}
                        className="rounded-full border border-gray-700 bg-gray-950/70 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        {tile}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/80">Possible Yaku</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.possibleYaku.length > 0 ? (
                      analysis.possibleYaku.map(name => (
                        <span
                          key={name}
                          className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100"
                        >
                          {formatYakuName(name)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No likely yaku line yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {analysis.callRecommendation.length > 0 ? (
              <div className="space-y-1 rounded-xl border border-sky-500/25 bg-sky-500/10 p-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/80">Why Call / Why Pass</p>
                {analysis.callRecommendation.map(line => (
                  <p key={line} className="text-[11px] font-medium text-sky-100">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {!focusMode && analysis.warnings.length > 0 ? (
        <div className="mt-2 space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
          {analysis.warnings.map(warning => (
            <p key={warning} className="text-[11px] text-red-200">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
