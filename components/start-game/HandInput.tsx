'use client';

import { WindValue } from '@/lib/types';
import { useEffect, useMemo } from 'react';
import { validateStartingHand } from '@/lib/tileValidator';
import { Tile } from '@/lib/types';

interface HandInputProps {
  value: string;
  onChange: (value: string) => void;
  redFivesEnabled: boolean;
  seatWind: WindValue | '';
  onValidTiles: (tiles: Tile[]) => void;
}

export function HandInput({ value, onChange, redFivesEnabled, seatWind, onValidTiles }: HandInputProps) {
  const expectedTileCount = seatWind === 'east' ? 14 : 13;
  const result = useMemo(
    () =>
      value.trim()
        ? validateStartingHand(value, redFivesEnabled, expectedTileCount)
        : { valid: false, tiles: [], errors: [] },
    [value, redFivesEnabled, expectedTileCount]
  );
  const errors = result.errors;
  const tileCount = result.tiles.length;

  const isValid = errors.length === 0 && tileCount === expectedTileCount;
  const hasInput = value.trim().length > 0;

  useEffect(() => {
    if (result.valid) {
      onValidTiles(result.tiles);
    }
  }, [onValidTiles, result]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="block text-sm font-semibold text-gray-700">Starting Hand</label>
        {hasInput && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {tileCount} / {expectedTileCount} tiles
          </span>
        )}
      </div>

      <p className="text-xs font-medium text-gray-600">
        {seatWind === 'east'
          ? 'You are dealer. Enter 14 starting tiles.'
          : 'Enter 13 starting tiles.'}
      </p>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="123m 456p 789s E E R R Wh"
        rows={3}
        className={`w-full rounded-lg border-2 p-3 font-mono text-sm transition-colors resize-none ${
          !hasInput
            ? 'border-gray-300 bg-white'
            : isValid
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-red-400 bg-red-50'
        }`}
      />

      <p className="text-xs text-gray-500">
        Notation:{' '}
        <span className="break-words font-mono">
          1m–9m 1p–9p 1s–9s E S W N R G Wh 0m 0p 0s
        </span>{' '}
        (red fives)
      </p>

      {errors.map((err, i) => (
        <p key={i} className="text-sm text-red-600 flex items-start gap-1.5">
          <span className="mt-px">⚠</span>
          <span>{err}</span>
        </p>
      ))}
    </div>
  );
}
