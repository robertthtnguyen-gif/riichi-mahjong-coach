'use client';

import { useState } from 'react';
import { Opponent, OpponentPosition, Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';
import { validateSingleTile } from '@/lib/tileValidator';

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
  const [discardInput, setDiscardInput] = useState('');
  const [discardError, setDiscardError] = useState('');

  function handleAddDiscard() {
    setDiscardError('');
    const result = validateSingleTile(discardInput.trim());
    if (!result.valid) {
      setDiscardError(result.errors.join(', '));
      return;
    }
    onDiscard(opponent.position, result.tiles[0]);
    setDiscardInput('');
  }

  return (
    <div className="bg-gray-700/50 rounded-xl p-3 space-y-3 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {POSITION_LABELS[opponent.position]}
          </span>
          <span className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded font-mono">
            {WIND_LABELS[opponent.seatWind]}
          </span>
          <span className="text-xs text-gray-400">{opponent.tileCount}T</span>
        </div>
        <div className="flex items-center gap-1.5">
          {opponent.isRiichi && (
            <span className="text-xs font-bold px-1.5 py-0.5 bg-red-900 text-red-300 rounded border border-red-700">
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

      {/* Add discard */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={discardInput}
          onChange={e => { setDiscardInput(e.target.value); setDiscardError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDiscard(); } }}
          placeholder="Add discard…"
          className="flex-1 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white font-mono text-xs placeholder-gray-500 focus:outline-none focus:border-blue-400 min-w-0"
        />
        <button
          type="button"
          onClick={handleAddDiscard}
          disabled={!discardInput.trim()}
          className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-40 shrink-0"
        >
          +
        </button>
      </div>
      {discardError && <p className="text-xs text-red-400">{discardError}</p>}

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
