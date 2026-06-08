'use client';

import { useMemo } from 'react';
import { GameConfig, Meld, Tile, WindValue } from '@/lib/types';
import { detectYaku } from '@/lib/yaku';

interface YakuPanelProps {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  config: GameConfig;
  isRiichi: boolean;
  drawnTile: Tile | null;
  phase: 'draw' | 'discard';
}

function formatYakuName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function YakuPanel({
  hand,
  melds,
  seatWind,
  config,
  isRiichi,
  drawnTile,
  phase,
}: YakuPanelProps) {
  const result = useMemo(
    () =>
      detectYaku({
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
