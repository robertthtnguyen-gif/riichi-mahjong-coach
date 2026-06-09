'use client';

import { Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface CurrentHandProps {
  hand: Tile[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
  isRiichi: boolean;
  phase: 'OPPONENT_TURN' | 'OPPONENT_DISCARDED' | 'CALL_DECISION' | 'MY_DRAW' | 'MY_DISCARD' | 'HAND_END';
  bestDiscard?: string | null;
  drawnTile?: Tile | null;
  onDiscardSelected?: () => void;
  compact?: boolean;
  focusMode?: boolean;
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

export function CurrentHand({
  hand,
  selectedTileId,
  onSelectTile,
  isRiichi,
  phase,
  bestDiscard = null,
  drawnTile = null,
  onDiscardSelected,
  compact = false,
  focusMode = false,
}: CurrentHandProps) {
  return (
    <div
      className={`sticky z-10 space-y-2 rounded-[1.25rem] border bg-gray-900/95 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur sm:top-[4.5rem] lg:top-[5.5rem] ${
        focusMode
          ? 'top-[5.15rem] border-cyan-500/25 p-2.5'
          : 'top-[4.25rem] border-gray-800 p-3'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
            Current Hand
          </h3>
          <p className={`${focusMode ? 'text-sm' : 'text-xs'} font-medium text-white`}>
            {hand.length} tiles ready
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {drawnTile ? (
            <span className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
              Drawn: {tileLabel(drawnTile)}
            </span>
          ) : null}
          {bestDiscard ? (
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-200">
              Best discard: {bestDiscard}
            </span>
          ) : null}
          {isRiichi && (
            <span className="rounded-full border border-red-700 bg-red-900 px-2 py-0.5 text-xs font-bold text-red-300">
              RIICHI
            </span>
          )}
        </div>
      </div>

      {hand.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No tiles in hand.</p>
      ) : (
        <div className={`flex flex-wrap ${focusMode ? 'gap-0.5' : 'gap-1'}`}>
          {hand.map(tile => (
            <TileDisplay
              key={tile.id}
              tile={tile}
              size={compact || focusMode ? 'compact' : 'sm'}
              selected={selectedTileId === tile.id || tileLabel(tile) === bestDiscard}
              onClick={isRiichi ? undefined : () => onSelectTile(tile.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-500">
          {isRiichi
            ? 'Hand is locked in riichi.'
            : phase === 'MY_DISCARD'
            ? 'Tap a tile, then discard it.'
            : 'Use Draw to add the current tile first.'}
        </p>
        {!isRiichi && phase === 'MY_DISCARD' && onDiscardSelected ? (
          <button
            type="button"
            onClick={onDiscardSelected}
            disabled={!selectedTileId}
            className={`rounded-full bg-rose-500 font-semibold text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 ${
              focusMode ? 'px-3.5 py-2 text-xs' : 'px-3 py-1.5 text-[11px]'
            }`}
          >
            Discard Selected
          </button>
        ) : null}
      </div>
    </div>
  );
}
