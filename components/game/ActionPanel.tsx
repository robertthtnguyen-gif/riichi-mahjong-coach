'use client';

import { useState } from 'react';
import { Tile } from '@/lib/types';
import { parseTileNotation } from '@/lib/tileParser';

interface ActionPanelProps {
  selectedTileId: string | null;
  hand: Tile[];
  phase: 'draw' | 'discard';
  isRiichi: boolean;
  onDiscard: (tileId: string) => void;
  onRiichi: (tileId: string) => void;
  onChi: (meldTiles: [Tile, Tile, Tile]) => void;
  onPon: (meldTiles: [Tile, Tile, Tile]) => void;
  onKan: (meldTiles: Tile[]) => void;
}

type ActiveInput = 'chi' | 'pon' | 'kan' | null;

export function ActionPanel({
  selectedTileId,
  hand,
  phase,
  isRiichi,
  onDiscard,
  onRiichi,
  onChi,
  onPon,
  onKan,
}: ActionPanelProps) {
  const [activeInput, setActiveInput] = useState<ActiveInput>(null);
  const [meldInput, setMeldInput] = useState('');
  const [meldError, setMeldError] = useState('');

  const canDiscard = phase === 'discard' && selectedTileId !== null && !isRiichi;
  const canRiichi = phase === 'discard' && selectedTileId !== null && !isRiichi;
  const canCall = !isRiichi;

  function handleDiscard() {
    if (!selectedTileId) return;
    onDiscard(selectedTileId);
  }

  function handleRiichi() {
    if (!selectedTileId) return;
    onRiichi(selectedTileId);
  }

  function toggleInput(type: ActiveInput) {
    setActiveInput(prev => (prev === type ? null : type));
    setMeldInput('');
    setMeldError('');
  }

  function handleMeldSubmit() {
    setMeldError('');
    let tiles: Tile[];
    try {
      tiles = parseTileNotation(meldInput);
    } catch (e) {
      setMeldError((e as Error).message);
      return;
    }

    if (activeInput === 'chi' || activeInput === 'pon') {
      if (tiles.length !== 3) {
        setMeldError('Chi and Pon require exactly 3 tiles.');
        return;
      }
      if (activeInput === 'chi') onChi(tiles as [Tile, Tile, Tile]);
      else onPon(tiles as [Tile, Tile, Tile]);
    } else if (activeInput === 'kan') {
      if (tiles.length !== 4) {
        setMeldError('Kan requires exactly 4 tiles.');
        return;
      }
      onKan(tiles);
    }

    setActiveInput(null);
    setMeldInput('');
  }

  function actionBtn(
    label: string,
    onClick: () => void,
    enabled: boolean,
    variant: 'primary' | 'danger' | 'warning' | 'accent'
  ) {
    const colors: Record<string, string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      warning: 'bg-amber-600 hover:bg-amber-700 text-white',
      accent: 'bg-purple-600 hover:bg-purple-700 text-white',
    };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!enabled}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${colors[variant]}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-700 bg-gray-800 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</h2>

      {!selectedTileId && phase === 'discard' && !isRiichi && (
        <p className="text-xs text-amber-400">Select a tile from your hand to discard.</p>
      )}
      {isRiichi && (
        <p className="text-xs text-red-400 font-medium">In Riichi — waiting for winning tile.</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actionBtn('Discard', handleDiscard, canDiscard, 'primary')}
        {actionBtn('Riichi', handleRiichi, canRiichi, 'danger')}
        {actionBtn('Chi', () => toggleInput('chi'), canCall, 'warning')}
        {actionBtn('Pon', () => toggleInput('pon'), canCall, 'warning')}
        {actionBtn('Kan', () => toggleInput('kan'), canCall, 'accent')}
      </div>

      {activeInput && (
        <div className="mt-3 space-y-2 rounded-lg border border-gray-600 bg-gray-700 p-3">
          <label className="text-xs font-semibold text-gray-300 uppercase">
            {activeInput === 'chi' && 'Chi — enter 3 tiles (e.g. 456m)'}
            {activeInput === 'pon' && 'Pon — enter 3 tiles (e.g. 555p)'}
            {activeInput === 'kan' && 'Kan — enter 4 tiles (e.g. 5555s)'}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={meldInput}
              onChange={e => { setMeldInput(e.target.value); setMeldError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMeldSubmit(); } }}
              placeholder={activeInput === 'kan' ? 'e.g. 5555m' : 'e.g. 456m'}
              className="min-w-0 flex-1 rounded border border-gray-500 bg-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none font-mono"
            />
            <div className="flex gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={handleMeldSubmit}
                className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:flex-none"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => toggleInput(null)}
                className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-500 sm:flex-none"
              >
                ✕
              </button>
            </div>
          </div>
          {meldError && <p className="text-xs text-red-400">{meldError}</p>}
        </div>
      )}
    </div>
  );
}
