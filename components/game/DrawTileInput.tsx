'use client';

import { useState } from 'react';
import { Tile } from '@/lib/types';
import { validateSingleTile } from '@/lib/tileValidator';

interface DrawTileInputProps {
  onDraw: (tile: Tile) => void;
  disabled?: boolean;
}

export function DrawTileInput({ onDraw, disabled }: DrawTileInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleDraw() {
    setError('');
    const result = validateSingleTile(input.trim());
    if (!result.valid) {
      setError(result.errors.join(', '));
      return;
    }
    onDraw(result.tiles[0]);
    setInput('');
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300">Draw Tile</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleDraw(); } }}
          placeholder="e.g. 5m"
          disabled={disabled}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleDraw}
          disabled={disabled || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Draw
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
