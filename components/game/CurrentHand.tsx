'use client';

import { Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface CurrentHandProps {
  hand: Tile[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
  isRiichi: boolean;
}

export function CurrentHand({ hand, selectedTileId, onSelectTile, isRiichi }: CurrentHandProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
          Current Hand
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{hand.length} tiles</span>
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
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {hand.map(tile => (
            <TileDisplay
              key={tile.id}
              tile={tile}
              size="sm"
              selected={selectedTileId === tile.id}
              onClick={isRiichi ? undefined : () => onSelectTile(tile.id)}
            />
          ))}
        </div>
      )}

      {!isRiichi && hand.length > 0 && (
        <p className="text-xs text-gray-500">Click a tile to select it for discarding.</p>
      )}
    </div>
  );
}
