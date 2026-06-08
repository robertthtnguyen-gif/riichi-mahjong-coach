'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameState, Tile, OpponentPosition, StartGameData } from '@/lib/types';
import { buildInitialState, useGameState } from '@/hooks/useGameState';
import { GameInfo } from '@/components/game/GameInfo';
import { CurrentHand } from '@/components/game/CurrentHand';
import { DrawTileInput } from '@/components/game/DrawTileInput';
import { ActionPanel } from '@/components/game/ActionPanel';
import { ShantenPanel } from '@/components/game/ShantenPanel';
import { OpponentTracking } from '@/components/game/OpponentTracking';
import { RecommendedAction } from '@/components/game/RecommendedAction';

function GameTable({ initialState }: { initialState: GameState }) {
  const { state, drawTile, discardTile, riichi, chi, pon, kan, opponentDiscard, opponentRiichi } =
    useGameState(initialState);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const router = useRouter();

  function handleDrawTile(tile: Tile) {
    drawTile(tile);
    setSelectedTileId(null);
  }

  function handleSelectTile(id: string) {
    setSelectedTileId(prev => (prev === id ? null : id));
  }

  function handleDiscard(tileId: string) {
    discardTile(tileId);
    setSelectedTileId(null);
  }

  function handleRiichi(tileId: string) {
    riichi(tileId);
    setSelectedTileId(null);
  }

  const SUIT_SUFFIX: Record<string, string> = { man: 'm', pin: 'p', sou: 's' };
  const WIND_LABEL: Record<string, string> = { east: 'E', south: 'S', west: 'W', north: 'N' };
  const DRAGON_LABEL: Record<string, string> = { red: 'R', green: 'G', white: 'Wh' };

  function tileLabel(tile: Tile): string {
    if (tile.suit === 'wind') return WIND_LABEL[tile.value as string];
    if (tile.suit === 'dragon') return DRAGON_LABEL[tile.value as string];
    return `${tile.isRed ? '0' : tile.value}${SUIT_SUFFIX[tile.suit]}`;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-700 bg-gray-800 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-base font-bold text-white sm:text-lg">Riichi Mahjong Coach</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 sm:gap-4 sm:text-sm">
            <span>Turn {state.turnCount}</span>
            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
              {state.phase === 'draw' ? 'Draw Phase' : 'Discard Phase'}
            </span>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 hover:text-white sm:text-sm"
            >
              New Game
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 p-3 sm:gap-6 sm:p-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)_20rem] lg:items-start lg:p-6">
          <aside className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:space-y-6 lg:sticky lg:top-6">
            <GameInfo player={state.player} config={state.config} />

            <hr className="border-gray-700" />

            <CurrentHand
              hand={state.player.hand}
              selectedTileId={selectedTileId}
              onSelectTile={handleSelectTile}
              isRiichi={state.player.isRiichi}
            />

            <DrawTileInput
              onDraw={handleDrawTile}
              disabled={state.phase === 'discard'}
            />

            {state.player.discards.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Your Discards ({state.player.discards.length})
                </h3>
                <div className="flex flex-wrap gap-1">
                  {state.player.discards.map(tile => (
                    <div
                      key={tile.id}
                      className="flex h-9 w-7 items-center justify-center rounded border border-amber-200 bg-amber-50 text-xs font-bold text-gray-700"
                      title={tileLabel(tile)}
                    >
                      {tileLabel(tile)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <main className="space-y-4 sm:space-y-6">
            <ActionPanel
              selectedTileId={selectedTileId}
              hand={state.player.hand}
              phase={state.phase}
              isRiichi={state.player.isRiichi}
              onDiscard={handleDiscard}
              onRiichi={handleRiichi}
              onChi={chi}
              onPon={pon}
              onKan={kan}
            />

            <ShantenPanel hand={state.player.hand} melds={state.player.melds} />

            <RecommendedAction
              hand={state.player.hand}
              melds={state.player.melds}
              seatWind={state.player.seatWind}
              config={state.config}
              isRiichi={state.player.isRiichi}
              isTsumo={state.phase === 'discard'}
            />
          </main>

          <aside className="rounded-2xl border border-gray-700 bg-gray-800 p-4 lg:sticky lg:top-6">
            <OpponentTracking
              opponents={state.opponents}
              onDiscard={opponentDiscard}
              onRiichi={opponentRiichi}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  const router = useRouter();
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const rawData = sessionStorage.getItem('rmj_game_data');
      const rawHand = sessionStorage.getItem('rmj_hand_tiles');
      const rawDora = sessionStorage.getItem('rmj_dora_tiles');

      if (!rawData || !rawHand) {
        router.replace('/');
        return;
      }

      const data: StartGameData = JSON.parse(rawData);
      const hand: Tile[] = JSON.parse(rawHand);
      const doraTiles: Tile[] = rawDora ? JSON.parse(rawDora) : [];

      setInitialState(buildInitialState(data, hand, doraTiles));
    } catch {
      setError('Failed to load game data. Please start a new game.');
    }
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  if (!initialState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  return <GameTable initialState={initialState} />;
}
