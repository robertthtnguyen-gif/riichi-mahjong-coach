'use client';

import { Opponent, OpponentPosition, Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';
import { TilePicker } from './TilePicker';

interface OpponentPanelProps {
  opponent: Opponent;
  onDiscard: (position: OpponentPosition, tile: Tile) => void;
  onRiichi: (position: OpponentPosition) => void;
}

const POSITION_LABELS: Record<OpponentPosition, string> = {
  left: 'Left Player',
  across: 'Across Player',
  right: 'Right Player',
};

const WIND_LABELS: Record<string, string> = {
  east: 'E', south: 'S', west: 'W', north: 'N',
};

export function OpponentPanel({ opponent, onDiscard, onRiichi }: OpponentPanelProps) {
  const pickerLabels = [
    '1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m',
    '1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p',
    '1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s',
    'E', 'S', 'W', 'N', 'R', 'G', 'Wh',
  ] as const;

  function makeTile(label: string): Tile {
    if (label === 'E') return { suit: 'wind', value: 'east', isRed: false, id: crypto.randomUUID() };
    if (label === 'S') return { suit: 'wind', value: 'south', isRed: false, id: crypto.randomUUID() };
    if (label === 'W') return { suit: 'wind', value: 'west', isRed: false, id: crypto.randomUUID() };
    if (label === 'N') return { suit: 'wind', value: 'north', isRed: false, id: crypto.randomUUID() };
    if (label === 'R') return { suit: 'dragon', value: 'red', isRed: false, id: crypto.randomUUID() };
    if (label === 'G') return { suit: 'dragon', value: 'green', isRed: false, id: crypto.randomUUID() };
    if (label === 'Wh') return { suit: 'dragon', value: 'white', isRed: false, id: crypto.randomUUID() };

    const isRed = label[0] === '0';
    const value = isRed ? 5 : Number(label[0]);
    const suitCode = label[1];
    const suit = suitCode === 'm' ? 'man' : suitCode === 'p' ? 'pin' : 'sou';
    return { suit, value, isRed, id: crypto.randomUUID() };
  }

  const pickerTiles = pickerLabels.map(makeTile);

  return (
    <div className="space-y-3 rounded-xl border border-gray-600 bg-gray-700/50 p-3">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {POSITION_LABELS[opponent.position]}
          </span>
          <span className="rounded bg-gray-600 px-1.5 py-0.5 font-mono text-xs text-gray-300">
            {WIND_LABELS[opponent.seatWind]}
          </span>
          <span className="text-xs text-gray-400">{opponent.tileCount}T</span>
        </div>
        <div className="flex items-center gap-1.5">
          {opponent.isRiichi && (
            <span className="rounded border border-red-700 bg-red-900 px-1.5 py-0.5 text-xs font-bold text-red-300">
              RIICHI
            </span>
          )}
          {!opponent.isRiichi && (
            <button
              type="button"
              onClick={() => onRiichi(opponent.position)}
              className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-red-800 text-gray-300 hover:text-red-300 rounded transition-colors border border-gray-500 hover:border-red-700"
            >
              Riichi
            </button>
          )}
        </div>
      </div>

      {/* Discards */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">
          Discards ({opponent.discards.length})
        </p>
        {opponent.discards.length === 0 ? (
          <p className="text-xs text-gray-600 italic">None yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {opponent.discards.map(tile => (
              <TileDisplay key={tile.id} tile={tile} size="xs" />
            ))}
          </div>
        )}
      </div>

      <TilePicker
        title="Add Discard"
        tiles={pickerTiles}
        onPick={tile => onDiscard(opponent.position, tile)}
        size="xs"
      />

      {/* Open Melds */}
      {opponent.melds.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Open Melds</p>
          <div className="space-y-1">
            {opponent.melds.map((meld, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-xs text-gray-500 uppercase w-6">{meld.type}</span>
                <div className="flex gap-0.5">
                  {meld.tiles.map(tile => (
                    <TileDisplay key={tile.id} tile={tile} size="xs" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
