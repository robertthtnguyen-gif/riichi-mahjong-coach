// components/game/TileDisplay.tsx

import { Tile } from '@/lib/types';

interface TileDisplayProps {
  tile: Tile;
  size?: 'xs' | 'sm' | 'md' | 'compact';
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const SUIT_SUFFIX: Record<string, string> = { man: 'm', pin: 'p', sou: 's' };
const WIND_LABEL: Record<string, string> = { east: 'E', south: 'S', west: 'W', north: 'N' };
const DRAGON_LABEL: Record<string, string> = { red: 'R', green: 'G', white: 'Wh' };

function getTileLabel(tile: Tile): string {
  if (tile.suit === 'wind') return WIND_LABEL[tile.value as string];
  if (tile.suit === 'dragon') return DRAGON_LABEL[tile.value as string];
  const displayVal = tile.isRed ? '0' : String(tile.value);
  return `${displayVal}${SUIT_SUFFIX[tile.suit]}`;
}

function getTileTextColor(tile: Tile): string {
  if (tile.isRed) return 'text-red-500';
  if (tile.suit === 'man') return 'text-red-700';
  if (tile.suit === 'pin') return 'text-blue-700';
  if (tile.suit === 'sou') return 'text-green-700';
  if (tile.suit === 'wind') return 'text-gray-700';
  if (tile.suit === 'dragon') {
    if (tile.value === 'red') return 'text-red-600';
    if (tile.value === 'green') return 'text-green-600';
    return 'text-gray-500';
  }
  return 'text-gray-700';
}

const SIZE_CLASSES: Record<string, string> = {
  xs: 'h-8 w-6 text-[10px]',
  sm: 'h-10 w-7 text-[11px]',
  md: 'w-11 h-14 text-sm',
  compact: 'h-9 w-6.5 text-[10px]',
};

export function TileDisplay({ tile, size = 'md', selected, onClick, disabled }: TileDisplayProps) {
  const label = getTileLabel(tile);
  const textColor = getTileTextColor(tile);
  const sizeClass = SIZE_CLASSES[size];
  const isInteractive = !!onClick && !disabled;

  const baseClasses = `${sizeClass} rounded border-2 font-bold flex items-center justify-center px-0.5 transition-all duration-150 select-none bg-amber-50 shadow-sm`;

  const stateClasses = selected
    ? 'border-blue-500 -translate-y-2 shadow-lg ring-2 ring-blue-300'
    : isInteractive
    ? 'border-amber-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-400 cursor-pointer'
    : 'border-amber-200 cursor-default';

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${stateClasses} ${textColor}`}
        title={label}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} ${stateClasses} ${textColor}`} title={label}>
      {label}
    </div>
  );
}
