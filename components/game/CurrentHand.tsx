'use client';

import { Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface CurrentHandProps {
  hand: Tile[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
  isRiichi: boolean;
  phase: 'draw' | 'discard';
  bestDiscard?: string | null;
  onDiscardSelected?: () => void;
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
  onDiscardSelected,
}: CurrentHandProps) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
            Current Hand
          </h3>
          <p className="text-sm font-medium text-white">{hand.length} tiles ready</p>
        </div>
        <div className="flex items-center gap-2">
          {bestDiscard ? (
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200">
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
        <div className="flex flex-wrap gap-1.5">
          {hand.map(tile => (
            <TileDisplay
              key={tile.id}
              tile={tile}
              size="sm"
              selected={selectedTileId === tile.id || tileLabel(tile) === bestDiscard}
              onClick={isRiichi ? undefined : () => onSelectTile(tile.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {isRiichi
            ? 'Hand is locked in riichi.'
            : phase === 'discard'
            ? 'Tap a tile, then discard it.'
            : 'Use Draw to add the current tile first.'}
        </p>
        {!isRiichi && phase === 'discard' && onDiscardSelected ? (
          <button
            type="button"
            onClick={onDiscardSelected}
            disabled={!selectedTileId}
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            Discard Selected
          </button>
        ) : null}
      </div>
    </div>
  );
}
