'use client';

import { useMemo, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { TilePicker } from './TilePicker';
import {
  GamePhase,
  Opponent,
  OpponentDiscardEvent,
  OpponentPosition,
  TableActor,
  Tile,
  WindValue,
} from '@/lib/types';
import { TileDisplay } from './TileDisplay';
import { CallRecommendation } from '@/lib/callAdvisor';
import { getFocusModeLayoutConfig } from '@/lib/focusModeLayout';

interface ActionPanelProps {
  hand: Tile[];
  opponents: Opponent[];
  selectedTileId: string | null;
  phase: GamePhase;
  currentTurn: TableActor;
  currentActor: WindValue;
  isRiichi: boolean;
  lastOpponentDiscard: OpponentDiscardEvent | null;
  callRecommendation: CallRecommendation | null;
  canRon: boolean;
  canTsumo: boolean;
  onDraw: (tile: Tile) => void;
  onDiscard: () => void;
  onRiichi: () => void;
  onChi: (meldTiles: [Tile, Tile, Tile]) => void;
  onPon: (meldTiles: [Tile, Tile, Tile]) => void;
  onKan: (meldTiles: Tile[]) => void;
  onRon: () => void;
  onTsumo: () => void;
  onPass: () => void;
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
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function buildChiOptions(hand: Tile[], calledTile: Tile | null): [Tile, Tile, Tile][] {
  if (!calledTile || !['man', 'pin', 'sou'].includes(calledTile.suit)) return [];
  const value = calledTile.value as number;
  const suit = calledTile.suit;
  return [
    [value - 2, value - 1],
    [value - 1, value + 1],
    [value + 1, value + 2],
  ]
    .filter(([a, b]) => a >= 1 && b <= 9)
    .map(([a, b]) => {
      const first: Tile = { suit, value: a, isRed: false, id: `chi-${a}-${suit}` };
      const second: Tile = { suit, value: b, isRed: false, id: `chi-${b}-${suit}` };
      return [first, second, calledTile] as [Tile, Tile, Tile];
    })
    .filter(option => canRemoveTiles(hand, option.slice(0, 2)));
}

function buildPonOption(hand: Tile[], calledTile: Tile | null): [Tile, Tile, Tile] | null {
  if (!calledTile) return null;
  const needed = [calledTile, calledTile];
  if (!canRemoveTiles(hand, needed)) return null;
  return [calledTile, calledTile, calledTile];
}

function buildKanOptions(hand: Tile[], calledTile: Tile | null): Tile[][] {
  const options: Tile[][] = [];
  const groups = new Map<string, Tile[]>();
  for (const tile of hand) {
    const key = `${tile.suit}:${tile.value}`;
    const list = groups.get(key) ?? [];
    list.push(tile);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    if (group.length === 4) {
      options.push(group);
    }
  }
  if (calledTile) {
    const matching = hand.filter(tile => sameTile(tile, calledTile));
    if (matching.length >= 3) {
      options.push([matching[0], matching[1], matching[2], calledTile]);
    }
  }
  return options;
}

export function getFocusActionKeys(): string[] {
  return ['draw', 'discard', 'opponent', 'chi', 'pon', 'kan', 'ron', 'riichi', 'pass'];
}

export function getExpectedOpponentPosition(
  currentTurn: TableActor,
  currentActor: WindValue,
  opponents: Opponent[]
): OpponentPosition | null {
  if (currentTurn === 'self') {
    return null;
  }

  const fromActor = opponents.find(opponent => opponent.seatWind === currentActor)?.position ?? null;
  if (fromActor) {
    return fromActor;
  }

  return currentTurn;
}

export function validateOpponentDiscardSelection(
  selectedOpponent: OpponentPosition,
  expectedOpponent: OpponentPosition | null,
  overrideEnabled: boolean
): string | null {
  if (!expectedOpponent || overrideEnabled || selectedOpponent === expectedOpponent) {
    return null;
  }

  return `It is ${POSITION_LABELS[expectedOpponent]} player’s turn. Use Override if this is a correction.`;
}

function primaryActionLabel(phase: GamePhase): string {
  switch (phase) {
    case 'OPPONENT_TURN':
      return 'Enter Opponent Discard';
    case 'CALL_DECISION':
    case 'OPPONENT_DISCARDED':
      return 'Choose Call or Pass';
    case 'MY_DRAW':
      return 'Enter Draw';
    case 'MY_DISCARD':
      return 'Discard Recommended Tile';
    case 'HAND_END':
      return 'Hand Complete';
  }
}

export function ActionPanel({
  hand,
  opponents,
  selectedTileId,
  phase,
  currentTurn,
  currentActor,
  isRiichi,
  lastOpponentDiscard,
  callRecommendation,
  canRon,
  canTsumo,
  onDraw,
  onDiscard,
  onRiichi,
  onChi,
  onPon,
  onKan,
  onRon,
  onTsumo,
  onPass,
  onOpponentDiscard,
  onOpponentRiichi,
  focusMode = false,
}: ActionPanelProps) {
  const layout = getFocusModeLayoutConfig(focusMode);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [manualOpponent, setManualOpponent] = useState<OpponentPosition>('left');
  const [overrideOpponent, setOverrideOpponent] = useState(false);
  const [opponentSelectionWarning, setOpponentSelectionWarning] = useState<string | null>(null);
  const drawTiles = useMemo(() => ALL_TILE_LABELS.map(label => makeRuntimeTile(label)), []);
  const expectedOpponent = useMemo(
    () => getExpectedOpponentPosition(currentTurn, currentActor, opponents),
    [currentTurn, currentActor, opponents]
  );
  const activeOpponent = overrideOpponent ? manualOpponent : expectedOpponent ?? manualOpponent;
  const chiOptions = useMemo(
    () => (lastOpponentDiscard?.position === 'left' ? buildChiOptions(hand, lastOpponentDiscard.tile) : []),
    [hand, lastOpponentDiscard]
  );
  const ponOption = useMemo(
    () => buildPonOption(hand, lastOpponentDiscard?.tile ?? null),
    [hand, lastOpponentDiscard]
  );
  const kanOptions = useMemo(
    () => buildKanOptions(hand, lastOpponentDiscard?.tile ?? null),
    [hand, lastOpponentDiscard]
  );

  const canDraw = phase === 'MY_DRAW';
  const canDiscard = phase === 'MY_DISCARD' && selectedTileId !== null && !isRiichi;
  const canRiichi = phase === 'MY_DISCARD' && selectedTileId !== null && !isRiichi;
  const canChi = phase === 'CALL_DECISION' && chiOptions.length > 0;
  const canPon = phase === 'CALL_DECISION' && ponOption !== null;
  const canKan = (phase === 'CALL_DECISION' || phase === 'MY_DISCARD') && kanOptions.length > 0;
  const canPass = phase === 'CALL_DECISION';

  function closeSheet() {
    setActiveSheet(null);
    setOpponentSelectionWarning(null);
  }

  function handleDrawPick(tile: Tile) {
    onDraw({ ...tile, id: crypto.randomUUID() });
    closeSheet();
  }

  function handleOpponentDiscard(position: OpponentPosition, tile: Tile) {
    const validationError = validateOpponentDiscardSelection(position, expectedOpponent, overrideOpponent);
    if (validationError) {
      setOpponentSelectionWarning(validationError);
      return;
    }

    setOpponentSelectionWarning(null);
    onOpponentDiscard(position, { ...tile, id: crypto.randomUUID() });
    closeSheet();
  }

  const buttons = [
    { key: 'draw', label: 'Draw', disabled: !canDraw, onClick: () => setActiveSheet('draw') },
    { key: 'discard', label: 'Discard', disabled: !canDiscard, onClick: onDiscard },
    { key: 'opponent', label: 'Opponent', disabled: phase !== 'OPPONENT_TURN', onClick: () => setActiveSheet('opponent') },
    { key: 'chi', label: 'Chi', disabled: !canChi, onClick: () => setActiveSheet('chi') },
    { key: 'pon', label: 'Pon', disabled: !canPon, onClick: () => setActiveSheet('pon') },
    { key: 'kan', label: 'Kan', disabled: !canKan, onClick: () => setActiveSheet('kan') },
    { key: 'ron', label: 'Ron', disabled: !canRon, onClick: onRon },
    { key: 'riichi', label: 'Riichi', disabled: !canRiichi, onClick: onRiichi },
    { key: 'pass', label: 'Pass', disabled: !canPass, onClick: onPass },
  ];

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-gray-950/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-3 backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className={`rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 ${focusMode ? 'py-4' : 'py-3'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Current Step</p>
            <p className={`mt-1 font-semibold text-white ${focusMode ? 'text-base' : 'text-sm'}`}>
              {primaryActionLabel(phase)}
            </p>
            <p className={`mt-1 text-gray-300 ${focusMode ? 'text-sm' : 'text-xs'}`}>
              {currentTurn === 'self'
                ? 'Your turn is active.'
                : phase === 'CALL_DECISION'
                ? `Opponent discarded ${lastOpponentDiscard ? tileLabel(lastOpponentDiscard.tile) : 'a tile'}.`
                : `Waiting on ${String(currentTurn)} player.`}
            </p>
            {callRecommendation && phase === 'CALL_DECISION' ? (
              <p className="mt-2 text-xs text-sky-100">
                {callRecommendation.action}
                {callRecommendation.callType ? ` ${callRecommendation.callType}` : ''} • {callRecommendation.confidence}
              </p>
            ) : null}
            {canTsumo ? (
              <button
                type="button"
                onClick={onTsumo}
                className="mt-3 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-100"
              >
                Tsumo
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {buttons.map(button => (
              <button
                key={button.key}
                type="button"
                disabled={button.disabled}
                onClick={button.onClick}
                className={`rounded-2xl border border-gray-800 bg-gray-900 font-semibold uppercase tracking-[0.16em] text-gray-200 disabled:bg-gray-900/70 disabled:text-gray-600 ${layout.actionButtonClass}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomSheet open={activeSheet === 'draw'} title="Draw Tile" description="Pick your draw." onClose={closeSheet}>
        <TilePicker tiles={drawTiles} onPick={handleDrawPick} />
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'opponent'}
        title="Opponent Discard"
        description="Enter the current opponent discard."
        onClose={closeSheet}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Expected Opponent</p>
              <p className="text-sm font-semibold text-white">
                {expectedOpponent ? `${POSITION_LABELS[expectedOpponent]} player discarded` : 'Select opponent'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextOverride = !overrideOpponent;
                setOverrideOpponent(nextOverride);
                setOpponentSelectionWarning(null);
                if (!nextOverride && expectedOpponent) {
                  setManualOpponent(expectedOpponent);
                }
              }}
              className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                overrideOpponent
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                  : 'border-gray-800 bg-gray-900 text-gray-300'
              }`}
            >
              {overrideOpponent ? 'Override On' : 'Override'}
            </button>
          </div>

          {opponentSelectionWarning ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-medium text-amber-100">{opponentSelectionWarning}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {opponents.map(opponent => (
              <button
                key={opponent.position}
                type="button"
                onClick={() => setManualOpponent(opponent.position)}
                disabled={!overrideOpponent && expectedOpponent !== opponent.position}
                className={`rounded-2xl border px-3 py-3 text-left ${
                  activeOpponent === opponent.position
                    ? 'border-cyan-400/50 bg-cyan-500/10'
                    : 'border-gray-800 bg-gray-900'
                } disabled:opacity-45`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {POSITION_LABELS[opponent.position]}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{opponent.tileCount} tiles</p>
              </button>
            ))}
          </div>
          {opponents
            .filter(opponent => opponent.position === activeOpponent)
            .map(opponent => (
              <div key={opponent.position} className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Current Opponent</p>
                    <p className="text-sm font-semibold text-white">{POSITION_LABELS[opponent.position]} player</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpponentRiichi(opponent.position)}
                    disabled={opponent.isRiichi}
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:border-gray-800 disabled:bg-gray-900 disabled:text-gray-600"
                  >
                    Mark Riichi
                  </button>
                </div>
                <TilePicker
                  title={`${POSITION_LABELS[opponent.position]} player discarded`}
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
        description={lastOpponentDiscard ? `Use ${tileLabel(lastOpponentDiscard.tile)} from your left.` : 'No chi available.'}
        onClose={closeSheet}
      >
        <div className="space-y-3">
          {chiOptions.map(option => (
            <button
              key={option.map(tileLabel).join('-')}
              type="button"
              onClick={() => {
                onChi(option);
                closeSheet();
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 p-3"
            >
              <div className="flex gap-1.5">
                {option.map(tile => (
                  <TileDisplay key={tile.id} tile={tile} size="sm" />
                ))}
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Chi</span>
            </button>
          ))}
          {chiOptions.length === 0 ? <p className="text-sm text-gray-500">No legal chi available.</p> : null}
        </div>
      </BottomSheet>

      <BottomSheet open={activeSheet === 'pon'} title="Pon Option" description="Call the discard as pon." onClose={closeSheet}>
        {ponOption ? (
          <button
            type="button"
            onClick={() => {
              onPon(ponOption);
              closeSheet();
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 p-3"
          >
            <div className="flex gap-1.5">
              {ponOption.map((tile, index) => (
                <TileDisplay key={`${tile.id}-${index}`} tile={tile} size="sm" />
              ))}
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Pon</span>
          </button>
        ) : (
          <p className="text-sm text-gray-500">No legal pon available.</p>
        )}
      </BottomSheet>

      <BottomSheet open={activeSheet === 'kan'} title="Kan Options" description="Select a kan line." onClose={closeSheet}>
        <div className="space-y-3">
          {kanOptions.map(option => (
            <button
              key={option.map(tile => tile.id).join('-')}
              type="button"
              onClick={() => {
                onKan(option);
                closeSheet();
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 p-3"
            >
              <div className="flex gap-1.5">
                {option.map(tile => (
                  <TileDisplay key={tile.id} tile={tile} size="sm" />
                ))}
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-200">Kan</span>
            </button>
          ))}
          {kanOptions.length === 0 ? <p className="text-sm text-gray-500">No legal kan available.</p> : null}
        </div>
      </BottomSheet>
    </>
  );
}
