'use client';

import { useMemo, useState } from 'react';
import {
  GameConfig,
  Meld,
  OpponentDiscardEvent,
  Tile,
  WindValue,
} from '@/lib/types';
import {
  detectCurrentYaku,
  detectYaku,
  findWinningTiles,
  YakuContext,
  YakuEntry,
  YakuName,
} from '@/lib/yaku';
import { getYakuReference } from '@/lib/yakuEncyclopedia';
import { YakuReferenceDialog } from './YakuReferenceDialog';

interface YakuPanelProps {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  config: GameConfig;
  isRiichi: boolean;
  drawnTile: Tile | null;
  phase: 'draw' | 'discard';
  lastOpponentDiscard: OpponentDiscardEvent | null;
  collapsed?: boolean;
}

function formatYakuName(name: YakuName): string {
  return getYakuReference(name).name;
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

function hanTone(entry: YakuEntry): string {
  if (entry.yakuman) {
    return 'border-red-500/30 bg-red-500/10 text-red-100';
  }
  if (entry.han >= 6) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  }
  if (entry.han >= 3) {
    return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100';
  }
  if (entry.han >= 2) {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  }
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function YakuPill({
  entry,
  label,
  onOpen,
}: {
  entry: YakuEntry;
  label: string;
  onOpen: (name: YakuName) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.name)}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-110 ${hanTone(entry)}`}
    >
      {formatYakuName(entry.name)} {label}
    </button>
  );
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
  collapsed = false,
}: YakuPanelProps) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [selectedYaku, setSelectedYaku] = useState<YakuName | null>(null);

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
  const confirmedTotalHan = result.yaku.reduce((sum, entry) => sum + entry.han, 0);

  function openReference(name: YakuName | null = null) {
    setSelectedYaku(name);
    setReferenceOpen(true);
  }

  const body = (
    <div className="space-y-4">
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
          <div className="flex flex-wrap gap-2">
            {currentYaku.map(entry => (
              <YakuPill
                key={entry.name}
                entry={entry}
                label="(confirmed now)"
                onOpen={openReference}
              />
            ))}
          </div>
        </div>
      )}

      {result.yaku.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Confirmed Yaku</p>
            <p className="text-xs font-semibold text-indigo-200">
              Total: {result.isYakuman ? 'Yakuman' : `${confirmedTotalHan} Han`}
            </p>
          </div>
          <div className="space-y-2">
            {result.yaku.map(entry => (
              <button
                key={entry.name}
                type="button"
                onClick={() => openReference(entry.name)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-110 ${hanTone(entry)}`}
              >
                <span className="text-sm font-medium text-white">{formatYakuName(entry.name)}</span>
                <span className="text-xs font-semibold">
                  {entry.yakuman ? 'Yakuman' : `${entry.han} Han`}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : result.possible.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Possible Yaku</p>
          <div className="flex flex-wrap gap-2">
            {result.possible.map(entry => (
              <YakuPill
                key={entry.name}
                entry={entry}
                label="(possible)"
                onOpen={openReference}
              />
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

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-gray-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
          Yaku
        </h3>
        <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-200">
          Han {result.han}
        </span>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => openReference()}
          className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-100"
        >
          Yaku Reference
        </button>
      </div>
      {collapsed ? (
        <details className="mt-3">
          <summary className="cursor-pointer list-none rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm font-medium text-white">
            Show yaku details
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      ) : (
        <div className="mt-4">{body}</div>
      )}
      {referenceOpen ? (
        <YakuReferenceDialog
          open={referenceOpen}
          initialYakuId={selectedYaku}
          onClose={() => setReferenceOpen(false)}
        />
      ) : null}
    </div>
  );
}
