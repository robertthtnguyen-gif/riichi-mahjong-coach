# Riichi Mahjong Coach — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-page Phase 1 web app — a Start Game form that validates a 13-tile hand, and a Game Table page with full state tracking for the player and three opponents.

**Architecture:** The Start Game page stores parsed form data in `sessionStorage` and navigates to `/game`; the Game Table page reads that data to initialize a `useReducer`-based game state. All interaction is client-side with no database or external APIs.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript, Tailwind CSS v4, App Router, sessionStorage for cross-page state handoff.

---

## File Map

| Path | Responsibility |
|------|---------------|
| `lib/types.ts` | All shared TypeScript interfaces and union types |
| `lib/tileParser.ts` | Parse tile notation strings (`"123m 456p E"`) → `Tile[]` |
| `lib/tileValidator.ts` | Validate hand (13 tiles) and single-tile inputs |
| `hooks/useGameState.ts` | `useReducer`-based game state hook + `buildInitialState` |
| `components/start-game/WindSelector.tsx` | Clickable wind-option buttons |
| `components/start-game/BooleanToggle.tsx` | Yes/No toggle buttons |
| `components/start-game/HandInput.tsx` | Textarea with live parse+validation feedback |
| `components/start-game/StartGameForm.tsx` | Composes all start-game inputs; submits to `/game` |
| `components/game/TileDisplay.tsx` | Single tile card (suit-colored, selectable) |
| `components/game/CurrentHand.tsx` | Renders player's hand as TileDisplay grid |
| `components/game/DrawTileInput.tsx` | Text input + button to draw a tile |
| `components/game/GameInfo.tsx` | Left panel: winds, dealer, dora indicator |
| `components/game/ActionPanel.tsx` | Action buttons: Discard, Chi, Pon, Kan, Riichi |
| `components/game/RecommendedAction.tsx` | Center panel placeholder for future strategy |
| `components/game/OpponentPanel.tsx` | Single opponent: discards, melds, riichi, add-discard input |
| `components/game/OpponentTracking.tsx` | Renders all three OpponentPanels |
| `app/layout.tsx` | Root layout — update title/description |
| `app/page.tsx` | Start Game page (replaces boilerplate) |
| `app/game/page.tsx` | Game Table page — three-column layout |

---

## Task 1: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
// lib/types.ts

export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon';
export type WindValue = 'east' | 'south' | 'west' | 'north';
export type DragonValue = 'red' | 'green' | 'white';

export interface Tile {
  suit: Suit;
  value: number | WindValue | DragonValue;
  isRed: boolean;
  id: string;
}

export type MeldType = 'chi' | 'pon' | 'kan' | 'closed-kan';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
}

export type OpponentPosition = 'left' | 'across' | 'right';

export interface Opponent {
  position: OpponentPosition;
  seatWind: WindValue;
  discards: Tile[];
  melds: Meld[];
  isRiichi: boolean;
  tileCount: number;
}

export interface Player {
  seatWind: WindValue;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  isDealer: boolean;
  isRiichi: boolean;
}

export interface GameConfig {
  roundWind: WindValue;
  doraIndicatorStr: string;
  doraTiles: Tile[];
  redFivesEnabled: boolean;
  openTanyaoEnabled: boolean;
}

export type GamePhase = 'draw' | 'discard';

export interface GameState {
  player: Player;
  opponents: Opponent[];
  config: GameConfig;
  phase: GamePhase;
  drawnTile: Tile | null;
  turnCount: number;
}

export interface StartGameData {
  seatWind: WindValue;
  roundWind: WindValue;
  isDealer: boolean;
  doraIndicatorStr: string;
  redFivesEnabled: boolean;
  openTanyaoEnabled: boolean;
  startingHandStr: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors (file is type definitions only).

---

## Task 2: Tile Parser

**Files:**
- Create: `lib/tileParser.ts`

- [ ] **Step 1: Write `lib/tileParser.ts`**

```typescript
// lib/tileParser.ts

import { Tile, Suit, WindValue, DragonValue } from './types';

const SUIT_MAP: Record<string, Suit> = { m: 'man', p: 'pin', s: 'sou' };

const WIND_MAP: Record<string, WindValue> = {
  E: 'east',
  S: 'south',
  W: 'west',
  N: 'north',
};

const DRAGON_MAP: Record<string, DragonValue> = {
  R: 'red',
  G: 'green',
  Wh: 'white',
};

function makeTile(
  suit: Suit,
  value: number | WindValue | DragonValue,
  isRed: boolean,
  counter: { n: number }
): Tile {
  return { suit, value, isRed, id: `${suit}-${value}-${isRed ? 'r' : ''}${counter.n++}` };
}

/**
 * Parses Riichi Mahjong tile notation into Tile objects.
 *
 * Supported tokens:
 *   - Suited groups: "123m", "456p", "789s" (digits followed by m/p/s)
 *   - Red fives: "0m", "0p", "0s" (standalone or in a group like "0m5m")
 *   - Wind tiles: "E", "S", "W", "N"
 *   - Dragon tiles: "R", "G", "Wh"
 *
 * Throws an Error for unrecognized tokens.
 */
export function parseTileNotation(input: string): Tile[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const tiles: Tile[] = [];
  const counter = { n: 0 };

  for (const token of tokens) {
    if (WIND_MAP[token] !== undefined) {
      tiles.push(makeTile('wind', WIND_MAP[token], false, counter));
      continue;
    }

    if (DRAGON_MAP[token] !== undefined) {
      tiles.push(makeTile('dragon', DRAGON_MAP[token], false, counter));
      continue;
    }

    const suitMatch = token.match(/^([0-9]+)([mps])$/);
    if (suitMatch) {
      const suit = SUIT_MAP[suitMatch[2]];
      for (const ch of suitMatch[1]) {
        const num = parseInt(ch, 10);
        const isRed = num === 0;
        tiles.push(makeTile(suit, isRed ? 5 : num, isRed, counter));
      }
      continue;
    }

    throw new Error(`Invalid tile notation: "${token}"`);
  }

  return tiles;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

---

## Task 3: Tile Validator

**Files:**
- Create: `lib/tileValidator.ts`

- [ ] **Step 1: Write `lib/tileValidator.ts`**

```typescript
// lib/tileValidator.ts

import { Tile } from './types';
import { parseTileNotation } from './tileParser';

export interface ValidationResult {
  valid: boolean;
  tiles: Tile[];
  errors: string[];
}

export function validateHandInput(input: string, redFivesEnabled: boolean): ValidationResult {
  if (!input.trim()) {
    return { valid: false, tiles: [], errors: ['Starting hand is required.'] };
  }

  let tiles: Tile[];
  try {
    tiles = parseTileNotation(input);
  } catch (e) {
    return { valid: false, tiles: [], errors: [(e as Error).message] };
  }

  const errors: string[] = [];

  if (tiles.length !== 13) {
    errors.push(`Hand must have exactly 13 tiles (found ${tiles.length}).`);
  }

  if (!redFivesEnabled && tiles.some(t => t.isRed)) {
    errors.push('Red fives (0m/0p/0s) are not enabled in this game.');
  }

  return { valid: errors.length === 0, tiles, errors };
}

export function validateSingleTile(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: false, tiles: [], errors: ['Tile notation is required.'] };
  }

  let tiles: Tile[];
  try {
    tiles = parseTileNotation(input);
  } catch (e) {
    return { valid: false, tiles: [], errors: [(e as Error).message] };
  }

  if (tiles.length !== 1) {
    return {
      valid: false,
      tiles,
      errors: [`Expected exactly 1 tile, found ${tiles.length}.`],
    };
  }

  return { valid: true, tiles, errors: [] };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

---

## Task 4: Game State Hook

**Files:**
- Create: `hooks/useGameState.ts`

- [ ] **Step 1: Write `hooks/useGameState.ts`**

```typescript
// hooks/useGameState.ts

'use client';

import { useReducer } from 'react';
import { GameState, Tile, OpponentPosition, WindValue } from '@/lib/types';

type GameAction =
  | { type: 'DRAW_TILE'; tile: Tile }
  | { type: 'DISCARD_TILE'; tileId: string }
  | { type: 'CHI'; meldTiles: [Tile, Tile, Tile] }
  | { type: 'PON'; meldTiles: [Tile, Tile, Tile] }
  | { type: 'KAN'; meldTiles: Tile[] }
  | { type: 'RIICHI'; tileId: string }
  | { type: 'OPPONENT_DISCARD'; position: OpponentPosition; tile: Tile }
  | { type: 'OPPONENT_RIICHI'; position: OpponentPosition }
  | { type: 'OPPONENT_MELD'; position: OpponentPosition; meldType: 'chi' | 'pon' | 'kan'; tiles: Tile[] };

function removeById(hand: Tile[], id: string): Tile[] {
  const idx = hand.findIndex(t => t.id === id);
  if (idx === -1) return hand;
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DRAW_TILE':
      return {
        ...state,
        phase: 'discard',
        drawnTile: action.tile,
        player: {
          ...state.player,
          hand: [...state.player.hand, action.tile],
        },
      };

    case 'DISCARD_TILE':
      return {
        ...state,
        phase: 'draw',
        drawnTile: null,
        turnCount: state.turnCount + 1,
        player: {
          ...state.player,
          hand: removeById(state.player.hand, action.tileId),
          discards: [
            ...state.player.discards,
            state.player.hand.find(t => t.id === action.tileId)!,
          ].filter(Boolean),
        },
      };

    case 'RIICHI': {
      const discarded = state.player.hand.find(t => t.id === action.tileId);
      return {
        ...state,
        phase: 'draw',
        drawnTile: null,
        turnCount: state.turnCount + 1,
        player: {
          ...state.player,
          isRiichi: true,
          hand: removeById(state.player.hand, action.tileId),
          discards: discarded
            ? [...state.player.discards, discarded]
            : state.player.discards,
        },
      };
    }

    case 'CHI':
      return {
        ...state,
        phase: 'discard',
        player: {
          ...state.player,
          melds: [...state.player.melds, { type: 'chi', tiles: action.meldTiles }],
        },
      };

    case 'PON':
      return {
        ...state,
        phase: 'discard',
        player: {
          ...state.player,
          melds: [...state.player.melds, { type: 'pon', tiles: action.meldTiles }],
        },
      };

    case 'KAN':
      return {
        ...state,
        player: {
          ...state.player,
          melds: [...state.player.melds, { type: 'kan', tiles: action.meldTiles }],
        },
      };

    case 'OPPONENT_DISCARD':
      return {
        ...state,
        opponents: state.opponents.map(o =>
          o.position === action.position
            ? {
                ...o,
                discards: [...o.discards, action.tile],
                tileCount: Math.max(0, o.tileCount - 1),
              }
            : o
        ),
      };

    case 'OPPONENT_RIICHI':
      return {
        ...state,
        opponents: state.opponents.map(o =>
          o.position === action.position ? { ...o, isRiichi: true } : o
        ),
      };

    case 'OPPONENT_MELD':
      return {
        ...state,
        opponents: state.opponents.map(o =>
          o.position === action.position
            ? {
                ...o,
                melds: [...o.melds, { type: action.meldType, tiles: action.tiles }],
              }
            : o
        ),
      };

    default:
      return state;
  }
}

const WIND_ORDER: WindValue[] = ['east', 'south', 'west', 'north'];

function getOpponentWinds(playerSeat: WindValue): [WindValue, WindValue, WindValue] {
  const idx = WIND_ORDER.indexOf(playerSeat);
  // In riichi mahjong seating: right=shimocha (+1), across=toimen (+2), left=kamicha (+3)
  return [
    WIND_ORDER[(idx + 3) % 4], // left (kamicha)
    WIND_ORDER[(idx + 2) % 4], // across (toimen)
    WIND_ORDER[(idx + 1) % 4], // right (shimocha)
  ];
}

export function buildInitialState(
  data: import('@/lib/types').StartGameData,
  hand: Tile[],
  doraTiles: Tile[]
): GameState {
  const [leftWind, acrossWind, rightWind] = getOpponentWinds(data.seatWind);

  return {
    player: {
      seatWind: data.seatWind,
      hand,
      discards: [],
      melds: [],
      isDealer: data.isDealer,
      isRiichi: false,
    },
    opponents: [
      {
        position: 'left',
        seatWind: leftWind,
        discards: [],
        melds: [],
        isRiichi: false,
        tileCount: 13,
      },
      {
        position: 'across',
        seatWind: acrossWind,
        discards: [],
        melds: [],
        isRiichi: false,
        tileCount: 13,
      },
      {
        position: 'right',
        seatWind: rightWind,
        discards: [],
        melds: [],
        isRiichi: false,
        tileCount: 13,
      },
    ],
    config: {
      roundWind: data.roundWind,
      doraIndicatorStr: data.doraIndicatorStr,
      doraTiles,
      redFivesEnabled: data.redFivesEnabled,
      openTanyaoEnabled: data.openTanyaoEnabled,
    },
    phase: 'draw',
    drawnTile: null,
    turnCount: 0,
  };
}

export function useGameState(initialState: GameState) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return {
    state,
    drawTile: (tile: Tile) => dispatch({ type: 'DRAW_TILE', tile }),
    discardTile: (tileId: string) => dispatch({ type: 'DISCARD_TILE', tileId }),
    riichi: (tileId: string) => dispatch({ type: 'RIICHI', tileId }),
    chi: (meldTiles: [Tile, Tile, Tile]) => dispatch({ type: 'CHI', meldTiles }),
    pon: (meldTiles: [Tile, Tile, Tile]) => dispatch({ type: 'PON', meldTiles }),
    kan: (meldTiles: Tile[]) => dispatch({ type: 'KAN', meldTiles }),
    opponentDiscard: (position: OpponentPosition, tile: Tile) =>
      dispatch({ type: 'OPPONENT_DISCARD', position, tile }),
    opponentRiichi: (position: OpponentPosition) =>
      dispatch({ type: 'OPPONENT_RIICHI', position }),
    opponentMeld: (
      position: OpponentPosition,
      meldType: 'chi' | 'pon' | 'kan',
      tiles: Tile[]
    ) => dispatch({ type: 'OPPONENT_MELD', position, meldType, tiles }),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

---

## Task 5: Start Game Form Components

**Files:**
- Create: `components/start-game/WindSelector.tsx`
- Create: `components/start-game/BooleanToggle.tsx`
- Create: `components/start-game/HandInput.tsx`
- Create: `components/start-game/StartGameForm.tsx`

- [ ] **Step 1: Write `components/start-game/WindSelector.tsx`**

```tsx
// components/start-game/WindSelector.tsx
'use client';

import { WindValue } from '@/lib/types';

interface WindSelectorProps {
  label: string;
  value: WindValue;
  onChange: (wind: WindValue) => void;
  options: WindValue[];
}

const WIND_LABELS: Record<WindValue, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
};

export function WindSelector({ label, value, onChange, options }: WindSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(wind => (
          <button
            key={wind}
            type="button"
            onClick={() => onChange(wind)}
            className={`px-5 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
              value === wind
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {WIND_LABELS[wind]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/start-game/BooleanToggle.tsx`**

```tsx
// components/start-game/BooleanToggle.tsx
'use client';

interface BooleanToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanToggle({ label, value, onChange }: BooleanToggleProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex gap-2">
        {([true, false] as const).map(opt => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-5 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
              value === opt
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {opt ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/start-game/HandInput.tsx`**

```tsx
// components/start-game/HandInput.tsx
'use client';

import { useEffect, useState } from 'react';
import { validateHandInput } from '@/lib/tileValidator';
import { Tile } from '@/lib/types';

interface HandInputProps {
  value: string;
  onChange: (value: string) => void;
  redFivesEnabled: boolean;
  onValidTiles: (tiles: Tile[]) => void;
}

export function HandInput({ value, onChange, redFivesEnabled, onValidTiles }: HandInputProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [tileCount, setTileCount] = useState(0);

  useEffect(() => {
    if (!value.trim()) {
      setErrors([]);
      setTileCount(0);
      return;
    }
    const result = validateHandInput(value, redFivesEnabled);
    setErrors(result.errors);
    setTileCount(result.tiles.length);
    if (result.valid) onValidTiles(result.tiles);
  }, [value, redFivesEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = errors.length === 0 && tileCount === 13;
  const hasInput = value.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">Starting Hand</label>
        {hasInput && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {tileCount} / 13 tiles
          </span>
        )}
      </div>

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
        Notation: <span className="font-mono">1m–9m &nbsp; 1p–9p &nbsp; 1s–9s &nbsp; E S W N &nbsp; R G Wh &nbsp; 0m 0p 0s</span> (red fives)
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
```

- [ ] **Step 4: Write `components/start-game/StartGameForm.tsx`**

```tsx
// components/start-game/StartGameForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WindSelector } from './WindSelector';
import { BooleanToggle } from './BooleanToggle';
import { HandInput } from './HandInput';
import { WindValue, Tile, StartGameData } from '@/lib/types';
import { validateHandInput, validateSingleTile } from '@/lib/tileValidator';

export function StartGameForm() {
  const router = useRouter();

  const [seatWind, setSeatWind] = useState<WindValue>('east');
  const [roundWind, setRoundWind] = useState<WindValue>('east');
  const [isDealer, setIsDealer] = useState(false);
  const [doraIndicatorStr, setDoraIndicatorStr] = useState('');
  const [redFivesEnabled, setRedFivesEnabled] = useState(true);
  const [openTanyaoEnabled, setOpenTanyaoEnabled] = useState(true);
  const [startingHandStr, setStartingHandStr] = useState('');
  const [validHandTiles, setValidHandTiles] = useState<Tile[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const handResult = validateHandInput(startingHandStr, redFivesEnabled);
    if (!handResult.valid) {
      setSubmitError('Fix the hand validation errors before starting.');
      return;
    }

    let doraTiles: Tile[] = [];
    if (doraIndicatorStr.trim()) {
      const doraResult = validateSingleTile(doraIndicatorStr);
      if (!doraResult.valid) {
        setSubmitError(`Invalid dora indicator: ${doraResult.errors.join(', ')}`);
        return;
      }
      doraTiles = doraResult.tiles;
    }

    const gameData: StartGameData = {
      seatWind,
      roundWind,
      isDealer,
      doraIndicatorStr,
      redFivesEnabled,
      openTanyaoEnabled,
      startingHandStr,
    };

    try {
      sessionStorage.setItem('rmj_game_data', JSON.stringify(gameData));
      sessionStorage.setItem('rmj_hand_tiles', JSON.stringify(handResult.tiles));
      sessionStorage.setItem('rmj_dora_tiles', JSON.stringify(doraTiles));
    } catch {
      setSubmitError('Failed to save game data. Please try again.');
      return;
    }

    setIsSubmitting(true);
    router.push('/game');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <WindSelector
        label="Seat Wind"
        value={seatWind}
        onChange={setSeatWind}
        options={['east', 'south', 'west', 'north']}
      />

      <WindSelector
        label="Round Wind"
        value={roundWind}
        onChange={setRoundWind}
        options={['east', 'south']}
      />

      <BooleanToggle label="Dealer?" value={isDealer} onChange={setIsDealer} />

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Dora Indicator</label>
        <input
          type="text"
          value={doraIndicatorStr}
          onChange={e => setDoraIndicatorStr(e.target.value)}
          placeholder="e.g. 5m"
          className="w-full rounded-lg border-2 border-gray-300 p-3 font-mono text-sm focus:border-emerald-400 focus:outline-none"
        />
        <p className="text-xs text-gray-500">Enter a single tile notation (optional)</p>
      </div>

      <BooleanToggle
        label="Red Fives Enabled?"
        value={redFivesEnabled}
        onChange={setRedFivesEnabled}
      />

      <BooleanToggle
        label="Open Tanyao Enabled?"
        value={openTanyaoEnabled}
        onChange={setOpenTanyaoEnabled}
      />

      <HandInput
        value={startingHandStr}
        onChange={setStartingHandStr}
        redFivesEnabled={redFivesEnabled}
        onValidTiles={setValidHandTiles}
      />

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {isSubmitting ? 'Starting…' : 'Start Game'}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

---

## Task 6: Start Game Page + Layout Update

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the entire file with:

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Riichi Mahjong Coach',
  description: 'A coaching assistant for Riichi Mahjong players',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
// app/page.tsx
import { StartGameForm } from '@/components/start-game/StartGameForm';

export default function StartGamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-gray-900 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Riichi Mahjong Coach
          </h1>
          <p className="mt-2 text-emerald-300 text-sm">
            Set up your game to begin coaching
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <StartGameForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Start dev server and verify the Start Game page renders**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm run dev
```

Open `http://localhost:3000`. Verify:
- Dark green gradient background
- White card with all form fields
- Seat Wind: East/South/West/North buttons
- Round Wind: East/South buttons
- Dealer: Yes/No buttons
- Dora Indicator: text input
- Red Fives Enabled: Yes/No
- Open Tanyao Enabled: Yes/No
- Starting Hand: textarea with tile count badge
- Start Game button (disabled look when invalid)

- [ ] **Step 4: Test form validation**

Enter `123m 456p` in the hand input. Verify the badge shows "6 / 13 tiles" in amber.
Enter `123m 456p 789s EE RR` — 13 tiles, badge turns green.
Click Start Game with 6-tile hand — verify error message appears.
With valid hand, clicking Start Game should navigate to `/game` (404 is OK at this stage).

---

## Task 7: Game Table — TileDisplay Component

**Files:**
- Create: `components/game/TileDisplay.tsx`

- [ ] **Step 1: Write `components/game/TileDisplay.tsx`**

```tsx
// components/game/TileDisplay.tsx

import { Tile } from '@/lib/types';

interface TileDisplayProps {
  tile: Tile;
  size?: 'xs' | 'sm' | 'md';
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const SUIT_SUFFIX: Record<string, string> = { man: 'm', pin: 'p', sou: 's' };
const WIND_LABEL: Record<string, string> = { east: 'E', south: 'S', west: 'W', north: 'N' };
const DRAGON_LABEL: Record<string, string> = { red: 'R', green: 'G', white: 'Wh' };

function getTileLabel(tile: Tile): string {
  if (tile.suit === 'wind') return WIND_LABEL[tile.value as string];
  if (tile.suit === 'dragon') return DRAGON_LABEL[tile.value as string];
  const displayVal = tile.isRed ? '0' : String(tile.value);
  return `${displayVal}${SUIT_SUFFIX[tile.suit]}`;
}

function getTileTextColor(tile: Tile): string {
  if (tile.isRed) return 'text-red-500';
  if (tile.suit === 'man') return 'text-red-700';
  if (tile.suit === 'pin') return 'text-blue-700';
  if (tile.suit === 'sou') return 'text-green-700';
  if (tile.suit === 'wind') return 'text-gray-700';
  if (tile.suit === 'dragon') {
    if (tile.value === 'red') return 'text-red-600';
    if (tile.value === 'green') return 'text-green-600';
    return 'text-gray-500';
  }
  return 'text-gray-700';
}

const SIZE_CLASSES: Record<string, string> = {
  xs: 'w-7 h-9 text-xs',
  sm: 'w-9 h-12 text-xs',
  md: 'w-11 h-14 text-sm',
};

export function TileDisplay({ tile, size = 'md', selected, onClick, disabled }: TileDisplayProps) {
  const label = getTileLabel(tile);
  const textColor = getTileTextColor(tile);
  const sizeClass = SIZE_CLASSES[size];
  const isInteractive = !!onClick && !disabled;

  const baseClasses = `
    ${sizeClass} rounded border-2 font-bold flex items-center justify-center
    transition-all duration-150 select-none
    bg-amber-50 shadow-sm
  `;

  const stateClasses = selected
    ? 'border-blue-500 -translate-y-2 shadow-lg ring-2 ring-blue-300'
    : isInteractive
    ? 'border-amber-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-400 cursor-pointer'
    : 'border-amber-200 cursor-default';

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${stateClasses} ${textColor}`}
        title={label}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} ${stateClasses} ${textColor}`} title={label}>
      {label}
    </div>
  );
}
```

---

## Task 8: Game Table — Left Panel Components

**Files:**
- Create: `components/game/CurrentHand.tsx`
- Create: `components/game/DrawTileInput.tsx`
- Create: `components/game/GameInfo.tsx`

- [ ] **Step 1: Write `components/game/CurrentHand.tsx`**

```tsx
// components/game/CurrentHand.tsx
'use client';

import { Tile } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface CurrentHandProps {
  hand: Tile[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
  isRiichi: boolean;
}

export function CurrentHand({ hand, selectedTileId, onSelectTile, isRiichi }: CurrentHandProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Current Hand
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{hand.length} tiles</span>
          {isRiichi && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900 text-red-300 border border-red-700">
              RIICHI
            </span>
          )}
        </div>
      </div>

      {hand.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No tiles in hand.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {hand.map(tile => (
            <TileDisplay
              key={tile.id}
              tile={tile}
              size="md"
              selected={selectedTileId === tile.id}
              onClick={isRiichi ? undefined : () => onSelectTile(tile.id)}
            />
          ))}
        </div>
      )}

      {!isRiichi && hand.length > 0 && (
        <p className="text-xs text-gray-500">Click a tile to select it for discarding.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `components/game/DrawTileInput.tsx`**

```tsx
// components/game/DrawTileInput.tsx
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
```

- [ ] **Step 3: Write `components/game/GameInfo.tsx`**

```tsx
// components/game/GameInfo.tsx

import { GameConfig, Player } from '@/lib/types';
import { TileDisplay } from './TileDisplay';

interface GameInfoProps {
  player: Player;
  config: GameConfig;
}

const WIND_LABELS: Record<string, string> = {
  east: 'East',
  south: 'South',
  west: 'West',
  north: 'North',
};

export function GameInfo({ player, config }: GameInfoProps) {
  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Game Info</h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Round Wind</p>
          <p className="font-semibold text-white">{WIND_LABELS[config.roundWind]}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Seat Wind</p>
          <p className="font-semibold text-white">{WIND_LABELS[player.seatWind]}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Dealer</p>
          <p className="font-semibold text-white">{player.isDealer ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Red Fives</p>
          <p className="font-semibold text-white">{config.redFivesEnabled ? 'On' : 'Off'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Open Tanyao</p>
          <p className="font-semibold text-white">{config.openTanyaoEnabled ? 'On' : 'Off'}</p>
        </div>
      </div>

      <div>
        <p className="text-gray-400 text-xs mb-1.5">Dora Indicator</p>
        {config.doraTiles.length > 0 ? (
          <div className="flex gap-1.5">
            {config.doraTiles.map(tile => (
              <TileDisplay key={tile.id} tile={tile} size="sm" />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic text-xs">Not set</p>
        )}
      </div>

      {player.melds.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs mb-1.5">Open Melds</p>
          <div className="space-y-1.5">
            {player.melds.map((meld, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-xs text-gray-500 uppercase w-8">{meld.type}</span>
                <div className="flex gap-1">
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
```

---

## Task 9: Game Table — Center Panel Components

**Files:**
- Create: `components/game/ActionPanel.tsx`
- Create: `components/game/RecommendedAction.tsx`

- [ ] **Step 1: Write `components/game/ActionPanel.tsx`**

```tsx
// components/game/ActionPanel.tsx
'use client';

import { useState } from 'react';
import { Tile } from '@/lib/types';
import { validateSingleTile } from '@/lib/tileValidator';
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

  const actionBtn = (
    label: string,
    onClick: () => void,
    enabled: boolean,
    variant: 'primary' | 'danger' | 'warning' | 'accent'
  ) => {
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
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>

      {!selectedTileId && phase === 'discard' && !isRiichi && (
        <p className="text-xs text-amber-400">Select a tile from your hand to discard.</p>
      )}
      {isRiichi && (
        <p className="text-xs text-red-400 font-medium">In Riichi — waiting for winning tile.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {actionBtn('Discard', handleDiscard, canDiscard, 'primary')}
        {actionBtn('Riichi', handleRiichi, canRiichi, 'danger')}
        {actionBtn('Chi', () => toggleInput('chi'), canCall, 'warning')}
        {actionBtn('Pon', () => toggleInput('pon'), canCall, 'warning')}
        {actionBtn('Kan', () => toggleInput('kan'), canCall, 'accent')}
      </div>

      {activeInput && (
        <div className="mt-3 p-3 bg-gray-700 rounded-lg space-y-2 border border-gray-600">
          <label className="text-xs font-semibold text-gray-300 uppercase">
            {activeInput === 'chi' && 'Chi — enter 3 tiles (e.g. 456m)'}
            {activeInput === 'pon' && 'Pon — enter 3 tiles (e.g. 555p)'}
            {activeInput === 'kan' && 'Kan — enter 4 tiles (e.g. 5555s)'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={meldInput}
              onChange={e => { setMeldInput(e.target.value); setMeldError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMeldSubmit(); } }}
              placeholder={activeInput === 'kan' ? 'e.g. 5555m' : 'e.g. 456m'}
              className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-1.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleMeldSubmit}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => toggleInput(null)}
              className="px-3 py-1.5 bg-gray-600 text-gray-300 rounded text-sm hover:bg-gray-500 transition-colors"
            >
              ✕
            </button>
          </div>
          {meldError && <p className="text-xs text-red-400">{meldError}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `components/game/RecommendedAction.tsx`**

```tsx
// components/game/RecommendedAction.tsx

export function RecommendedAction() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/50 p-6 text-center">
      <div className="text-2xl mb-2">🀄</div>
      <h3 className="text-sm font-semibold text-gray-400 mb-1">Strategy Advisor</h3>
      <p className="text-xs text-gray-600 leading-relaxed">
        Shanten analysis, yaku detection, and ukeire recommendations will appear here in a future phase.
      </p>
    </div>
  );
}
```

---

## Task 10: Game Table — Right Panel (Opponent Tracking)

**Files:**
- Create: `components/game/OpponentPanel.tsx`
- Create: `components/game/OpponentTracking.tsx`

- [ ] **Step 1: Write `components/game/OpponentPanel.tsx`**

```tsx
// components/game/OpponentPanel.tsx
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
```

- [ ] **Step 2: Write `components/game/OpponentTracking.tsx`**

```tsx
// components/game/OpponentTracking.tsx

import { Opponent, OpponentPosition, Tile } from '@/lib/types';
import { OpponentPanel } from './OpponentPanel';

interface OpponentTrackingProps {
  opponents: Opponent[];
  onDiscard: (position: OpponentPosition, tile: Tile) => void;
  onRiichi: (position: OpponentPosition) => void;
}

export function OpponentTracking({ opponents, onDiscard, onRiichi }: OpponentTrackingProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Opponent Tracking
      </h2>
      {opponents.map(opponent => (
        <OpponentPanel
          key={opponent.position}
          opponent={opponent}
          onDiscard={onDiscard}
          onRiichi={onRiichi}
        />
      ))}
    </div>
  );
}
```

---

## Task 11: Game Table Page

**Files:**
- Create: `app/game/page.tsx`

- [ ] **Step 1: Write `app/game/page.tsx`**

```tsx
// app/game/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameState, Tile, OpponentPosition, StartGameData } from '@/lib/types';
import { buildInitialState, useGameState } from '@/hooks/useGameState';
import { GameInfo } from '@/components/game/GameInfo';
import { CurrentHand } from '@/components/game/CurrentHand';
import { DrawTileInput } from '@/components/game/DrawTileInput';
import { ActionPanel } from '@/components/game/ActionPanel';
import { RecommendedAction } from '@/components/game/RecommendedAction';
import { OpponentTracking } from '@/components/game/OpponentTracking';

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
      <div className="flex-1 flex gap-0 overflow-hidden">
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

          {/* Player discards */}
          {state.player.discards.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Your Discards ({state.player.discards.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {state.player.discards.map(tile => (
                  <div key={tile.id} className="w-7 h-9 bg-amber-50 border border-amber-200 rounded flex items-center justify-center text-xs font-bold text-gray-700">
                    {tile.suit === 'wind'
                      ? { east: 'E', south: 'S', west: 'W', north: 'N' }[tile.value as string]
                      : tile.suit === 'dragon'
                      ? { red: 'R', green: 'G', white: 'Wh' }[tile.value as string]
                      : `${tile.isRed ? '0' : tile.value}${{ man: 'm', pin: 'p', sou: 's' }[tile.suit]}`
                    }
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

          <RecommendedAction />
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
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run dev server and do a full end-to-end test**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm run dev
```

Test sequence:
1. Open `http://localhost:3000` — Start Game page renders.
2. Fill hand with `123m 456p 789s EE` (10 tiles) — badge shows "10 / 13 tiles" in amber.
3. Fill hand with `123m 456p 789s E S W N` — 13 tiles, badge turns green.
4. Set Dora Indicator to `5m`.
5. Click Start Game — navigates to `/game`.
6. Game Table renders with three panels.
7. Left panel shows: Round Wind, Seat Wind, Dealer, Dora, hand tiles, Draw Tile input.
8. Click a tile in the hand — it lifts up (blue border, translated up).
9. Click Discard in the center panel — tile moves to discards.
10. Type `3p` in Draw Tile and press Enter — tile appears in hand, phase changes.
11. In right panel, type `7m` into Left Player's discard input + press Enter — discard appears.
12. Click Riichi button for Left Player — RIICHI badge appears.
13. Test Chi/Pon/Kan buttons — inline form opens, entering `456m` and clicking OK adds a meld.
14. Click Riichi action with a tile selected — hand removes tile, RIICHI badge appears on player.

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Seat Wind selector (E/S/W/N) | Task 5 — WindSelector |
| Round Wind selector (E/S) | Task 5 — WindSelector |
| Dealer toggle | Task 5 — BooleanToggle |
| Dora Indicator input | Task 5 — StartGameForm |
| Red Fives toggle | Task 5 — BooleanToggle |
| Open Tanyao toggle | Task 5 — BooleanToggle |
| Starting Hand input | Task 5 — HandInput |
| Tile notation: 1m-9m, 1p-9p, 1s-9s, E S W N, R G Wh, 0m 0p 0s | Task 2 — tileParser |
| Validate 13-tile hand | Task 3 — tileValidator |
| Show validation errors | Task 5 — HandInput |
| Start Game button + navigation | Task 5 — StartGameForm, Task 6 — page.tsx |
| Current Hand display | Task 8 — CurrentHand |
| Draw Tile input | Task 8 — DrawTileInput |
| Current Dora Indicator | Task 8 — GameInfo |
| Seat Wind display | Task 8 — GameInfo |
| Round Wind display | Task 8 — GameInfo |
| Recommended Action placeholder | Task 9 — RecommendedAction |
| Opponent: Left/Across/Right | Task 10 — OpponentTracking |
| Opponent discards | Task 10 — OpponentPanel |
| Opponent Riichi status | Task 10 — OpponentPanel |
| Opponent open melds | Task 10 — OpponentPanel |
| Draw/Discard/Chi/Pon/Kan/Riichi buttons | Task 9 — ActionPanel |
| TypeScript interfaces: Tile, Player, Opponent, Meld, GameState | Task 1 — types.ts |
| All state in React state | Tasks 4, 11 — useGameState, GamePage |
| Display tile count | Tasks 5, 8 — HandInput, CurrentHand |
| Display dealer status | Task 8 — GameInfo |
| No Shanten/Yaku/Ukeire/Scoring/AI | Not implemented ✓ |
