'use client';

import { useMemo, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { TilePicker } from './TilePicker';
import { Opponent, OpponentDiscardEvent, OpponentPosition, Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface ActionPanelProps {
  hand: Tile[];
  opponents: Opponent[];
  selectedTileId: string | null;
  phase: 'draw' | 'discard';
  isRiichi: boolean;
  lastOpponentDiscard: OpponentDiscardEvent | null;
  onDraw: (tile: Tile) => void;
  onRiichi: (tileId: string) => void;
  onChi: (meldTiles: [Tile, Tile, Tile]) => void;
  onPon: (meldTiles: [Tile, Tile, Tile]) => void;
  onKan: (meldTiles: Tile[]) => void;
  onOpponentDiscard: (position: OpponentPosition, tile: Tile) => void;
  onOpponentRiichi: (position: OpponentPosition) => void;
  focusMode?: boolean;
}

type ActiveSheet = 'draw' | 'opponent' | 'chi' | 'pon' | 'kan' | null;

const POSITION_LABELS: Record<OpponentPosition, string> = {
  left: 'Left',
  across: 'Across',
  right: 'Right',
};

const ALL_TILE_LABELS = [
  '1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m',
  '1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p',
  '1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s',
  'E', 'S', 'W', 'N', 'R', 'G', 'Wh',
] as const;

function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind') {
    return { east: 'E', south: 'S', west: 'W', north: 'N' }[tile.value as string] ?? '';
  }
  if (tile.suit === 'dragon') {
    return { red: 'R', green: 'G', white: 'Wh' }[tile.value as string] ?? '';
  }
  const suffix = tile.suit === 'man' ? 'm' : tile.suit === 'pin' ? 'p' : 's';
  return `${tile.isRed ? '0' : tile.value}${suffix}`;
}

function sameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

function makeRuntimeTile(label: string): Tile {
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

function canRemoveTiles(hand: Tile[], needed: Tile[]): boolean {
  const remaining = [...hand];
  for (const need of needed) {
    const index = remaining.findIndex(tile => sameTile(tile, need));
    if (index === -1) {
      return false;
    }
    remaining.splice(index, 1);
  }
  return true;
}

function buildChiOptions(hand: Tile[], calledTile: Tile | null): [Tile, Tile, Tile][] {
  if (!calledTile || !['man', 'pin', 'sou'].includes(calledTile.suit)) {
    return [];
  }

  const value = calledTile.value as number;
  const suit = calledTile.suit;
  const ranges = [
    [value - 2, value - 1],
    [value - 1, value + 1],
    [value + 1, value + 2],
  ];

  return ranges
    .filter(([a, b]) => a >= 1 && b <= 9)
    .map(([a, b]) => {
      const first: Tile = { suit, value: a, isRed: false, id: `chi-${a}-${suit}` };
      const second: Tile = { suit, value: b, isRed: false, id: `chi-${b}-${suit}` };
      return [first, second, calledTile] as [Tile, Tile, Tile];
    })
    .filter(option => canRemoveTiles(hand, option.slice(0, 2)));
}

function buildPonOption(hand: Tile[], calledTile: Tile | null): [Tile, Tile, Tile] | null {
  if (!calledTile) {
    return null;
  }
  const needed = [calledTile, calledTile];
  if (!canRemoveTiles(hand, needed)) {
    return null;
  }
  return [calledTile, calledTile, calledTile];
}

function buildKanOptions(hand: Tile[]): Tile[][] {
  const groups = new Map<string, Tile[]>();

  for (const tile of hand) {
    const key = `${tile.suit}:${tile.value}`;
    const list = groups.get(key) ?? [];
    list.push(tile);
    groups.set(key, list);
  }

  return [...groups.values()].filter(group => group.length === 4);
}

function actionButtonStyle(active: boolean, disabled: boolean): string {
  if (disabled) {
    return 'border-gray-800 bg-gray-900/70 text-gray-600';
  }
  if (active) {
    return 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100';
  }
  return 'border-gray-800 bg-gray-900 text-gray-200';
}

export function ActionPanel({
  hand,
  opponents,
  selectedTileId,
  phase,
  isRiichi,
  lastOpponentDiscard,
  onDraw,
  onRiichi,
  onChi,
  onPon,
  onKan,
  onOpponentDiscard,
  onOpponentRiichi,
  focusMode = false,
}: ActionPanelProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [activeOpponent, setActiveOpponent] = useState<OpponentPosition>('left');
  const drawTiles = useMemo(() => ALL_TILE_LABELS.map(label => makeRuntimeTile(label)), []);
  const chiOptions = useMemo(
    () =>
      lastOpponentDiscard?.position === 'left'
        ? buildChiOptions(hand, lastOpponentDiscard.tile)
        : [],
    [hand, lastOpponentDiscard]
  );
  const ponOption = useMemo(
    () => buildPonOption(hand, lastOpponentDiscard?.tile ?? null),
    [hand, lastOpponentDiscard]
  );
  const kanOptions = useMemo(() => buildKanOptions(hand), [hand]);

  const canDraw = phase === 'draw';
  const canRiichi = phase === 'discard' && selectedTileId !== null && !isRiichi;
  const canChi = !isRiichi && chiOptions.length > 0;
  const canPon = !isRiichi && ponOption !== null;
  const canKan = !isRiichi && kanOptions.length > 0;

  function closeSheet() {
    setActiveSheet(null);
  }

  function handleDrawPick(tile: Tile) {
    onDraw({ ...tile, id: crypto.randomUUID() });
    closeSheet();
  }

  function handleOpponentDiscard(position: OpponentPosition, tile: Tile) {
    onOpponentDiscard(position, { ...tile, id: crypto.randomUUID() });
    closeSheet();
  }

  function handleRiichi() {
    if (!selectedTileId) {
      return;
    }
    onRiichi(selectedTileId);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-gray-950/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-3 backdrop-blur xl:static xl:rounded-[1.75rem] xl:border xl:bg-gray-900/90 xl:px-4 xl:pb-4 xl:pt-4">
        <div className={`mx-auto grid max-w-3xl gap-2 ${focusMode ? 'grid-cols-2' : 'grid-cols-6'}`}>
          {(focusMode
            ? [
                { key: 'draw', label: 'Draw', disabled: !canDraw },
                { key: 'opponent', label: 'Opponent', disabled: false },
              ]
            : [
            { key: 'draw', label: 'Draw', disabled: !canDraw },
            { key: 'opponent', label: 'Opponent', disabled: false },
            { key: 'chi', label: 'Chi', disabled: !canChi },
            { key: 'pon', label: 'Pon', disabled: !canPon },
            { key: 'kan', label: 'Kan', disabled: !canKan },
            { key: 'riichi', label: 'Riichi', disabled: !canRiichi },
          ]).map(action => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                if (action.key === 'riichi') {
                  handleRiichi();
                  return;
                }
                setActiveSheet(action.key as ActiveSheet);
              }}
              className={`rounded-2xl border px-1 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${actionButtonStyle(activeSheet === action.key, action.disabled)}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <BottomSheet
        open={activeSheet === 'draw'}
        title="Draw Tile"
        description="Pick the tile you just drew."
        onClose={closeSheet}
      >
        <TilePicker tiles={drawTiles} onPick={handleDrawPick} />
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'opponent'}
        title="Opponent Tracking"
        description="Collapsed by default. Pick a player, then log their discard or riichi."
        onClose={closeSheet}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {opponents.map(opponent => (
              <button
                key={opponent.position}
                type="button"
                onClick={() => setActiveOpponent(opponent.position)}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  activeOpponent === opponent.position
                    ? 'border-cyan-400/50 bg-cyan-500/10'
                    : 'border-gray-800 bg-gray-900'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {POSITION_LABELS[opponent.position]}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{opponent.tileCount} tiles</p>
                {opponent.isRiichi ? (
                  <p className="mt-1 text-xs font-semibold text-red-300">Riichi</p>
                ) : null}
              </button>
            ))}
          </div>

          {opponents
            .filter(opponent => opponent.position === activeOpponent)
            .map(opponent => (
              <div key={opponent.position} className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                      Current Player
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {POSITION_LABELS[opponent.position]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpponentRiichi(opponent.position)}
                    disabled={opponent.isRiichi}
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-gray-900 disabled:text-gray-600"
                  >
                    Mark Riichi
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                    Recent Discards
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {opponent.discards.length > 0 ? (
                      opponent.discards.slice(-12).map(tile => (
                        <TileDisplay key={tile.id} tile={tile} size="xs" />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No discards yet.</p>
                    )}
                  </div>
                </div>

                <TilePicker
                  title="Add Discard"
                  tiles={drawTiles}
                  onPick={tile => handleOpponentDiscard(opponent.position, tile)}
                  size="sm"
                />
              </div>
            ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'chi'}
        title="Chi Options"
        description={
          lastOpponentDiscard
            ? `Use ${tileLabel(lastOpponentDiscard.tile)} from the player on your left.`
            : 'No chi available.'
        }
        onClose={closeSheet}
      >
        <div className="space-y-3">
          {chiOptions.length > 0 ? (
            chiOptions.map(option => (
              <button
                key={option.map(tileLabel).join('-')}
                type="button"
                onClick={() => {
                  onChi(option);
                  closeSheet();
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 p-3 text-left"
              >
                <div className="flex gap-1.5">
                  {option.map(tile => (
                    <TileDisplay key={tile.id} tile={tile} size="sm" />
                  ))}
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                  Chi
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">No legal chi available.</p>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'pon'}
        title="Pon Option"
        description={
          lastOpponentDiscard ? `Call the current ${tileLabel(lastOpponentDiscard.tile)} discard.` : 'No pon available.'
        }
        onClose={closeSheet}
      >
        {ponOption ? (
          <button
            type="button"
            onClick={() => {
              onPon(ponOption);
              closeSheet();
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 p-3 text-left"
          >
            <div className="flex gap-1.5">
              {ponOption.map((tile, index) => (
                <TileDisplay key={`${tile.id}-${index}`} tile={tile} size="sm" />
              ))}
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              Pon
            </span>
          </button>
        ) : (
          <p className="text-sm text-gray-500">No legal pon available.</p>
        )}
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'kan'}
        title="Kan Options"
        description="Choose a four-of-a-kind from your hand."
        onClose={closeSheet}
      >
        <div className="space-y-3">
          {kanOptions.length > 0 ? (
            kanOptions.map(option => (
              <button
                key={option.map(tile => tile.id).join('-')}
                type="button"
                onClick={() => {
                  onKan(option);
                  closeSheet();
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 p-3 text-left"
              >
                <div className="flex gap-1.5">
                  {option.map(tile => (
                    <TileDisplay key={tile.id} tile={tile} size="sm" />
                  ))}
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-200">
                  Kan
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">No four-of-a-kind available.</p>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
