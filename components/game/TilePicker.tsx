'use client';

import { Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface TilePickerProps {
  title?: string;
  tiles: Tile[];
  selectedId?: string | null;
  onPick: (tile: Tile) => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export function TilePicker({
  title,
  tiles,
  selectedId = null,
  onPick,
  disabled = false,
  size = 'sm',
}: TilePickerProps) {
  return (
    <div className="space-y-2">
      {title ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
          {title}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {tiles.map(tile => (
          <TileDisplay
            key={tile.id}
            tile={tile}
            size={size}
            selected={selectedId === tile.id}
            onClick={disabled ? undefined : () => onPick(tile)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
