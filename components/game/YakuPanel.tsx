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
import { buildYakuProgress, inferPrimaryTarget } from '@/lib/yakuProgress';
import { YakuQuickInfo } from './YakuQuickInfo';
import { YakuProgressPanel } from './YakuProgressPanel';

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
  targetYaku: string;
  possibleYaku: YakuName[];
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

function formatYakuName(name: YakuName): string {
  return getYakuReference(name).name;
}

function hanLabel(entry: YakuEntry): string {
  return entry.yakuman ? 'Yakuman' : `${entry.han} Han`;
}

function InfoLine({
  name,
  suffix,
  extra,
  onInfo,
}: {
  name: YakuName;
  suffix?: string;
  extra?: string;
  onInfo: (name: YakuName) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950/40 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {formatYakuName(name)}
          {suffix ? <span className="text-gray-400"> {suffix}</span> : null}
        </p>
        {extra ? <p className="text-xs text-gray-400">{extra}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onInfo(name)}
        className="shrink-0 rounded-full border border-gray-700 bg-gray-900 px-2 py-1 text-xs font-semibold text-cyan-100"
        aria-label={`Info for ${formatYakuName(name)}`}
      >
        ⓘ
      </button>
    </div>
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
  targetYaku,
  possibleYaku,
}: YakuPanelProps) {
  const [infoYaku, setInfoYaku] = useState<YakuName | null>(null);

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

  const progress = useMemo(
    () =>
      buildYakuProgress(
        inferPrimaryTarget(targetYaku),
        hand,
        melds,
        seatWind,
        config.roundWind,
        possibleYaku,
        currentYaku.map(entry => entry.name)
      ),
    [targetYaku, hand, melds, seatWind, config.roundWind, possibleYaku, currentYaku]
  );

  const body = (
    <div className="space-y-4">
      {ronOpportunity && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">Ron Available</p>
          <p className="mt-1 text-sm font-semibold text-white">Win on {tileLabel(ronOpportunity.tile)}</p>
        </div>
      )}

      <YakuProgressPanel progress={progress} />

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Possible Yaku</p>
        {possibleYaku.length > 0 ? (
          possibleYaku.map(name => (
            <InfoLine key={name} name={name} suffix="(possible)" onInfo={setInfoYaku} />
          ))
        ) : (
          <p className="text-sm text-gray-500">No likely yaku line yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Confirmed Yaku</p>
        {result.yaku.length > 0 ? (
          <>
            {result.yaku.map(entry => (
              <InfoLine
                key={entry.name}
                name={entry.name}
                extra={hanLabel(entry)}
                onInfo={setInfoYaku}
              />
            ))}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
              <p className="text-sm font-semibold text-indigo-100">
                Total Han: {result.isYakuman ? 'Yakuman' : result.han}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">No confirmed yaku yet.</p>
        )}
      </div>
    </div>
  );

  const quickInfoEntry = infoYaku ? getYakuReference(infoYaku) : null;

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
      {collapsed ? (
        <details className="mt-3">
          <summary className="cursor-pointer list-none rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2 text-sm font-medium text-white">
            Show yaku status
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      ) : (
        <div className="mt-4">{body}</div>
      )}
      <YakuQuickInfo
        open={infoYaku !== null}
        entry={quickInfoEntry}
        onClose={() => setInfoYaku(null)}
      />
    </div>
  );
}
