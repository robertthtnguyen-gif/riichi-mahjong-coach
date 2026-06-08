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
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-white">Riichi Mahjong Coach</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Turn {state.turnCount}</span>
          <span className="capitalize px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-medium">
            {state.phase === 'draw' ? 'Draw Phase' : 'Discard Phase'}
          </span>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <aside className="w-72 shrink-0 bg-gray-800 border-r border-gray-700 overflow-y-auto p-4 space-y-6">
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
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Your Discards ({state.player.discards.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {state.player.discards.map(tile => (
                  <div
                    key={tile.id}
                    className="w-7 h-9 bg-amber-50 border border-amber-200 rounded flex items-center justify-center text-xs font-bold text-gray-700"
                    title={tileLabel(tile)}
                  >
                    {tileLabel(tile)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Panel */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
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

        {/* Right Panel */}
        <aside className="w-80 shrink-0 bg-gray-800 border-l border-gray-700 overflow-y-auto p-4">
          <OpponentTracking
            opponents={state.opponents}
            onDiscard={opponentDiscard}
            onRiichi={opponentRiichi}
          />
        </aside>
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
