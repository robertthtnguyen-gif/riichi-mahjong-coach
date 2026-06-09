'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameState, Tile, StartGameData } from '@/lib/types';
import { buildInitialState, useGameState } from '@/hooks/useGameState';
import { GameInfo } from '@/components/game/GameInfo';
import { CurrentHand } from '@/components/game/CurrentHand';
import { ActionPanel } from '@/components/game/ActionPanel';
import { OpponentTracking } from '@/components/game/OpponentTracking';
import { RecommendedAction } from '@/components/game/RecommendedAction';
import { YakuPanel } from '@/components/game/YakuPanel';
import { analyzeGameHand } from '@/lib/handAdvisor';

function GameTable({ initialState }: { initialState: GameState }) {
  const {
    state,
    drawTile,
    discardTile,
    riichi,
    chi,
    pon,
    kan,
    opponentDiscard,
    opponentRiichi,
  } = useGameState(initialState);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const router = useRouter();
  const analysis = useMemo(
    () =>
      analyzeGameHand(
        state.player.hand,
        state.player.melds,
        state.player.seatWind,
        state.config,
        state.player.isRiichi,
        state.phase === 'discard',
        state.lastOpponentDiscard
      ),
    [state]
  );

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

  function handleDiscardSelected() {
    if (!selectedTileId) {
      return;
    }
    handleDiscard(selectedTileId);
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
    <div className="min-h-screen bg-[#070b12] text-white">
      <header className="sticky top-0 z-20 border-b border-cyan-500/10 bg-[#07111b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-3 py-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.22em] text-white sm:text-base">
                Riichi Mahjong Coach
              </h1>
              <p className="text-xs text-cyan-100/60">Mobile-first live play workflow</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-gray-400">
              <span>Turn {state.turnCount}</span>
              <span className="rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1 font-medium capitalize text-gray-300">
                {state.phase === 'draw' ? 'Draw Phase' : 'Discard Phase'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Best</p>
              <p className="mt-1 text-lg font-black text-rose-300">{analysis.bestDiscard ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Shanten</p>
              <p className="mt-1 text-lg font-black text-white">{analysis.shanten}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Ukeire</p>
              <p className="mt-1 text-lg font-black text-emerald-300">{analysis.ukeire}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Target</p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold text-amber-100">
                {analysis.targetYaku}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
                Round {state.config.roundWind}
              </span>
              <span className="rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1">
                Seat {state.player.seatWind}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 hover:text-white"
            >
              New Game
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-3 pb-36 pt-3 sm:px-4 sm:pb-40 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-4 lg:px-6 lg:pb-8">
        <section className="flex min-w-0 flex-col gap-3">
          <CurrentHand
            hand={state.player.hand}
            selectedTileId={selectedTileId}
            onSelectTile={handleSelectTile}
            isRiichi={state.player.isRiichi}
            phase={state.phase}
            bestDiscard={analysis.bestDiscard}
            onDiscardSelected={handleDiscardSelected}
          />

          <div className="space-y-3">
            <RecommendedAction
              hand={state.player.hand}
              melds={state.player.melds}
              seatWind={state.player.seatWind}
              config={state.config}
              isRiichi={state.player.isRiichi}
              isTsumo={state.phase === 'discard'}
              lastOpponentDiscard={state.lastOpponentDiscard}
              analysis={analysis}
            />

            <div className="hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                <GameInfo player={state.player} config={state.config} />
              </div>
              <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                <YakuPanel
                  hand={state.player.hand}
                  melds={state.player.melds}
                  seatWind={state.player.seatWind}
                  config={state.config}
                  isRiichi={state.player.isRiichi}
                  drawnTile={state.drawnTile}
                  phase={state.phase}
                  lastOpponentDiscard={state.lastOpponentDiscard}
                />
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                <GameInfo player={state.player} config={state.config} />
              </div>
              <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                <YakuPanel
                  hand={state.player.hand}
                  melds={state.player.melds}
                  seatWind={state.player.seatWind}
                  config={state.config}
                  isRiichi={state.player.isRiichi}
                  drawnTile={state.drawnTile}
                  phase={state.phase}
                  lastOpponentDiscard={state.lastOpponentDiscard}
                />
              </div>
              <div className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-4">
                <OpponentTracking
                  opponents={state.opponents}
                  onDiscard={opponentDiscard}
                  onRiichi={opponentRiichi}
                />
              </div>
            </div>

            {state.player.discards.length > 0 && (
              <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Your Discards
                </h3>
                <div className="flex flex-wrap gap-1.5">
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
          </div>
        </section>

        <aside className="hidden flex-col gap-4 lg:flex">
          <div className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-4 lg:sticky lg:top-[12rem]">
            <OpponentTracking
              opponents={state.opponents}
              onDiscard={opponentDiscard}
              onRiichi={opponentRiichi}
            />
          </div>
        </aside>
      </main>

      <ActionPanel
        hand={state.player.hand}
        opponents={state.opponents}
        selectedTileId={selectedTileId}
        phase={state.phase}
        isRiichi={state.player.isRiichi}
        lastOpponentDiscard={state.lastOpponentDiscard}
        onDraw={handleDrawTile}
        onRiichi={handleRiichi}
        onChi={chi}
        onPon={pon}
        onKan={kan}
        onOpponentDiscard={opponentDiscard}
        onOpponentRiichi={opponentRiichi}
      />
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

      // Session storage is the external source of truth for restoring a saved game.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
