'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppMenu } from '@/components/app/AppMenu';
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
  const [focusMode, setFocusMode] = useState(false);
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
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-3 py-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[11px] font-semibold text-cyan-100/80 sm:text-xs">
              {`${state.config.roundWind[0].toUpperCase()}${state.config.roundWind.slice(1)} ${state.turnCount + 1} | ${state.player.seatWind[0].toUpperCase()}${state.player.seatWind.slice(1)} | Shanten ${analysis.shanten} | Ukeire ${analysis.ukeire}`}
            </p>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <AppMenu />
              </div>
              <button
                type="button"
                onClick={() => router.push('/help')}
                className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1 text-[11px] font-semibold text-gray-300 sm:hidden"
              >
                Help
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(prev => !prev)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  focusMode
                    ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                    : 'border border-gray-800 bg-gray-900 text-gray-300'
                }`}
              >
                Focus {focusMode ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 hover:text-white"
              >
                New
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-900/90 px-3 py-2">
            <p className="text-[11px] font-semibold text-rose-200">
              Best discard: <span className="text-white">{analysis.bestDiscard ?? '—'}</span>
            </p>
            <p className="truncate text-[11px] text-amber-100">{analysis.targetYaku}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-3 pb-36 pt-2 sm:px-4 sm:pb-40 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-4 lg:px-6 lg:pb-8">
        <section className="flex min-w-0 flex-col gap-3">
          <CurrentHand
            hand={state.player.hand}
            selectedTileId={selectedTileId}
            onSelectTile={handleSelectTile}
            isRiichi={state.player.isRiichi}
            phase={state.phase}
            bestDiscard={analysis.bestDiscard}
            onDiscardSelected={handleDiscardSelected}
            compact
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
              compact
              focusMode={focusMode}
            />

            {!focusMode && (
              <div className="hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                  <details>
                    <summary className="cursor-pointer list-none text-sm font-medium text-white">
                      Game info
                    </summary>
                    <div className="mt-3">
                      <GameInfo player={state.player} config={state.config} />
                    </div>
                  </details>
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
                    collapsed
                    targetYaku={analysis.targetYaku}
                    possibleYaku={analysis.possibleYaku}
                  />
                </div>
              </div>
            )}

            {!focusMode && (
              <div className="space-y-3 lg:hidden">
                <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                  <details>
                    <summary className="cursor-pointer list-none text-sm font-medium text-white">
                      Game info
                    </summary>
                    <div className="mt-3">
                      <GameInfo player={state.player} config={state.config} />
                    </div>
                  </details>
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
                    collapsed
                    targetYaku={analysis.targetYaku}
                    possibleYaku={analysis.possibleYaku}
                  />
                </div>
                <div className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-4">
                  <OpponentTracking
                    opponents={state.opponents}
                    onDiscard={opponentDiscard}
                    onRiichi={opponentRiichi}
                    collapsed
                  />
                </div>
              </div>
            )}

            {!focusMode && state.player.discards.length > 0 && (
              <div className="rounded-[1.5rem] border border-gray-800 bg-gray-900/90 p-4">
                <details>
                  <summary className="cursor-pointer list-none text-sm font-medium text-white">
                    Your discards
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
                </details>
              </div>
            )}
          </div>
        </section>

        <aside className={`hidden flex-col gap-4 lg:flex ${focusMode ? 'lg:hidden' : ''}`}>
          <div className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-4 lg:sticky lg:top-[12rem]">
            <OpponentTracking
              opponents={state.opponents}
              onDiscard={opponentDiscard}
              onRiichi={opponentRiichi}
              collapsed
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
        focusMode={focusMode}
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
