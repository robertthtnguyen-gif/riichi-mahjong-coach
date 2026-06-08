'use client';

import { useMemo } from 'react';
import {
  GameConfig,
  Meld,
  OpponentDiscardEvent,
  Tile,
  WindValue,
} from '@/lib/types';
import { detectCurrentYaku, detectYaku, findWinningTiles, YakuContext } from '@/lib/yaku';

interface YakuPanelProps {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  config: GameConfig;
  isRiichi: boolean;
  drawnTile: Tile | null;
  phase: 'draw' | 'discard';
  lastOpponentDiscard: OpponentDiscardEvent | null;
}

function formatYakuName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind') {
    return { east: 'E', south: 'S', west: 'W', north: 'N' }[tile.value as string] ?? '';
  }
  if (tile.suit === 'dragon') {
    return { red: 'R', green: 'G', white: 'Wh' }[tile.value as string] ?? '';
  }
  const suffix = tile.suit === 'man' ? 'm' : tile.suit === 'pin' ? 'p' : 's';
  return `${tile.isRed ? '0' : tile.value}${suffix}`;
}

export function YakuPanel({
  hand,
  melds,
  seatWind,
  config,
  isRiichi,
  drawnTile,
  phase,
  lastOpponentDiscard,
}: YakuPanelProps) {
  const context = useMemo<YakuContext>(
    () => ({
      hand,
      melds,
      seatWind,
      roundWind: config.roundWind,
      doraIndicators: config.doraTiles,
      isRiichi,
      winMethod: phase === 'discard' ? 'tsumo' : 'ron',
      winningTile: drawnTile,
      openTanyaoEnabled: config.openTanyaoEnabled,
    }),
    [hand, melds, seatWind, config, isRiichi, drawnTile, phase]
  );

  const result = useMemo(() => detectYaku(context), [context]);
  const currentYaku = useMemo(() => detectCurrentYaku(context), [context]);
  const winningTiles = useMemo(
    () =>
      findWinningTiles({
        ...context,
        winMethod: 'ron',
        winningTile: null,
      }),
    [context]
  );
  const ronOpportunity = useMemo(() => {
    if (!lastOpponentDiscard) {
      return null;
    }

    return (
      winningTiles.find(wait => tileLabel(wait.tile) === tileLabel(lastOpponentDiscard.tile)) ?? null
    );
  }, [lastOpponentDiscard, winningTiles]);

  return (
    <div className="space-y-4 rounded-xl border border-indigo-500/30 bg-gray-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
          Yaku
        </h3>
        <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-200">
          Han {result.han}
        </span>
      </div>

      {ronOpportunity && (
        <div className="space-y-2 rounded-xl border border-rose-400/50 bg-rose-500/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
            Ron Available
          </p>
          <p className="text-lg font-bold text-white">Win on {tileLabel(ronOpportunity.tile)}</p>
          <p className="text-sm text-rose-100">
            {ronOpportunity.result.isYakuman
              ? 'Yakuman hand ready.'
              : `${ronOpportunity.result.han} han available.`}
          </p>
        </div>
      )}

      {currentYaku.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Current Yaku</p>
          <div className="space-y-2">
            {currentYaku.map(entry => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2"
              >
                <span className="text-sm font-medium text-white">{formatYakuName(entry.name)}</span>
                <span className="text-xs font-semibold text-emerald-200">
                  {entry.yakuman ? 'Yakuman' : `${entry.han} han`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.yaku.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Confirmed Yaku</p>
          <div className="space-y-2">
            {result.yaku.map(entry => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2"
              >
                <span className="text-sm font-medium text-white">{formatYakuName(entry.name)}</span>
                <span className="text-xs font-semibold text-indigo-200">
                  {entry.yakuman ? 'Yakuman' : `${entry.han} han`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : result.possible.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Possible Yaku</p>
          <div className="flex flex-wrap gap-2">
            {result.possible.map(entry => (
              <span
                key={entry.name}
                className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200"
              >
                {formatYakuName(entry.name)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No confirmed or likely yaku yet.</p>
      )}

      {winningTiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Winning Tiles</p>
          <div className="flex flex-wrap gap-2">
            {winningTiles.map(wait => (
              <span
                key={tileLabel(wait.tile)}
                className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-200"
              >
                {tileLabel(wait.tile)}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
          {result.warnings.map(warning => (
            <p key={warning} className="text-sm text-amber-100">
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
