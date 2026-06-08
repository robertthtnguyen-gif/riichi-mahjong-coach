# Shanten Engine — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic shanten calculator for standard hand, chiitoitsu, and kokushi, display live results on the Game Table, and cover it with tests.

**Architecture:** A pure TypeScript module (`lib/shanten.ts`) converts the tile array to a 34-element count array and runs three independent shanten algorithms; the minimum result wins. A `ShantenPanel` React component calls `calcShanten` via `useMemo` and renders the status. No AI, no external libraries beyond Vitest for tests.

**Tech Stack:** TypeScript, Vitest (new dev dependency), React 19 `useMemo`, existing `lib/types.ts` types.

---

## Tile Index Reference

The count array has 34 slots:

| Index | Tile |
|-------|------|
| 0–8   | man 1–9 |
| 9–17  | pin 1–9 |
| 18–26 | sou 1–9 |
| 27    | East |
| 28    | South |
| 29    | West |
| 30    | North |
| 31    | Red dragon (Chun) |
| 32    | Green dragon (Hatsu) |
| 33    | White dragon (Haku) |

Kokushi terminals/honors: indices **0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33** (1m, 9m, 1p, 9p, 1s, 9s, E, S, W, N, R, G, Wh).

---

## File Map

| Path | Action | Responsibility |
|------|--------|---------------|
| `lib/shanten.ts` | Create | Core shanten algorithms |
| `lib/shanten.test.ts` | Create | Vitest test cases |
| `components/game/ShantenPanel.tsx` | Create | Display component |
| `app/game/page.tsx` | Modify | Add ShantenPanel, remove RecommendedAction |
| `package.json` | Modify | Add Vitest dev dependency + test script |
| `vitest.config.ts` | Create | Vitest config with `@` alias |

---

## Task 1: Install Vitest and configure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm install -D vitest
```

Expected: `vitest` added to `devDependencies` in `package.json`.

- [ ] **Step 2: Add test script to `package.json`**

Read `package.json`, then edit the `"scripts"` block to add `"test": "vitest run"`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
},
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 4: Verify Vitest runs (no tests yet)**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm test
```

Expected: `No test files found` or empty pass (exit code 0 or Vitest warns — either is fine).

---

## Task 2: Implement `lib/shanten.ts`

**Files:**
- Create: `lib/shanten.ts`

The algorithm:

**Standard shanten** — backtracking over a 34-element count array.  
Notation: `mentsu` = complete sets, `taatsu` = partial sets (pair wait, sequential taatsu, kanchan), `jantai` = whether a pair has been claimed as the head.  
Formula: `8 − 2·mentsu − min(taatsu, 4−mentsu) − (jantai ? 1 : 0)`.  
We try all meaningful subsets of the hand (triplet, sequence, pair-as-head, pair-as-taatsu, adjacent, kanchan) at each tile index, track the minimum shanten found, and skip unproductive tiles.

`pos = i % 9` gives position within a suit (0–8).  All suit-based checks (sequence, adjacent, kanchan) are guarded by `!honor` where `honor = i >= 27`, so honor tiles never accidentally access cross-suit indices.

**Chiitoitsu** — count tiles with `count >= 2` (capped at 7), return `6 − pairs`.

**Kokushi** — count unique orphan tiles and whether any orphan appears twice, return `13 − unique − (hasPair ? 1 : 0)`.

**Overall** — take the minimum across all three. When tied, prefer standard > chiitoitsu > kokushi. With open melds, skip chiitoitsu and kokushi (open hand cannot achieve either).

- [ ] **Step 1: Create `lib/shanten.ts`**

```typescript
// lib/shanten.ts

import { Tile, Meld, WindValue, DragonValue } from './types';

export type HandType = 'standard' | 'chiitoitsu' | 'kokushi';

export interface ShantenResult {
  shanten: number;
  handType: HandType;
}

// Kokushi terminal/honor indices: 1m,9m,1p,9p,1s,9s,E,S,W,N,R,G,Wh
const KOKUSHI = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33] as const;

function tileToIndex(tile: Tile): number {
  if (tile.suit === 'man') return (tile.value as number) - 1;
  if (tile.suit === 'pin') return 9 + (tile.value as number) - 1;
  if (tile.suit === 'sou') return 18 + (tile.value as number) - 1;
  if (tile.suit === 'wind') {
    const w: Record<WindValue, number> = { east: 0, south: 1, west: 2, north: 3 };
    return 27 + w[tile.value as WindValue];
  }
  const d: Record<DragonValue, number> = { red: 0, green: 1, white: 2 };
  return 31 + d[tile.value as DragonValue];
}

function handToCounts(tiles: Tile[]): number[] {
  const c = new Array(34).fill(0);
  for (const t of tiles) c[tileToIndex(t)]++;
  return c;
}

function kokushiShanten(counts: number[]): number {
  let unique = 0;
  let hasPair = false;
  for (const i of KOKUSHI) {
    if (counts[i] > 0) unique++;
    if (counts[i] >= 2) hasPair = true;
  }
  return 13 - unique - (hasPair ? 1 : 0);
}

function chiitoitsuShanten(counts: number[]): number {
  let pairs = 0;
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) pairs++;
  }
  return 6 - Math.min(pairs, 7);
}

function standardShanten(counts: number[], baseMentsu: number): number {
  let best = 8;

  function recurse(i: number, mentsu: number, taatsu: number, jantai: boolean): void {
    const t = Math.min(taatsu, 4 - mentsu);
    const s = 8 - 2 * mentsu - t - (jantai ? 1 : 0);
    if (s < best) best = s;
    if (best === -1) return;

    // advance to next non-zero tile
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) return;

    const honor = i >= 27;
    const pos = i % 9; // position within suit (0–8); irrelevant for honors

    // triplet (mentsu)
    if (counts[i] >= 3) {
      counts[i] -= 3;
      recurse(i, mentsu + 1, taatsu, jantai);
      counts[i] += 3;
    }

    // sequence (mentsu, suited only, pos 0–6)
    if (!honor && pos <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
      counts[i]--;
      counts[i + 1]--;
      counts[i + 2]--;
      recurse(i, mentsu + 1, taatsu, jantai);
      counts[i]++;
      counts[i + 1]++;
      counts[i + 2]++;
    }

    // pair as jantai (head)
    if (counts[i] >= 2 && !jantai) {
      counts[i] -= 2;
      recurse(i, mentsu, taatsu, true);
      counts[i] += 2;
    }

    // pair as taatsu
    if (counts[i] >= 2 && mentsu + taatsu < 4) {
      counts[i] -= 2;
      recurse(i, mentsu, taatsu + 1, jantai);
      counts[i] += 2;
    }

    // adjacent taatsu (suited only, pos 0–7)
    if (!honor && pos <= 7 && counts[i + 1] > 0 && mentsu + taatsu < 4) {
      counts[i]--;
      counts[i + 1]--;
      recurse(i, mentsu, taatsu + 1, jantai);
      counts[i]++;
      counts[i + 1]++;
    }

    // kanchan taatsu (suited only, pos 0–6)
    if (!honor && pos <= 6 && counts[i + 2] > 0 && mentsu + taatsu < 4) {
      counts[i]--;
      counts[i + 2]--;
      recurse(i, mentsu, taatsu + 1, jantai);
      counts[i]++;
      counts[i + 2]++;
    }

    // skip tile — move to next index
    recurse(i + 1, mentsu, taatsu, jantai);
  }

  recurse(0, baseMentsu, 0, false);
  return best;
}

/**
 * Calculates the shanten number for a player's hand.
 * Accounts for open melds as pre-built complete sets.
 * Returns the best (lowest) shanten across all hand types,
 * with standard preferred over chiitoitsu preferred over kokushi on ties.
 */
export function calcShanten(hand: Tile[], melds: Meld[] = []): ShantenResult {
  const counts = handToCounts(hand);
  const openMelds = melds.length;

  const std = standardShanten(counts, openMelds);

  // Chiitoitsu and Kokushi require closed hand
  if (openMelds > 0) {
    return { shanten: std, handType: 'standard' };
  }

  const chiit = chiitoitsuShanten(counts);
  const kok = kokushiShanten(counts);

  // Pick the hand type with the lowest shanten; prefer standard on ties
  if (std <= chiit && std <= kok) return { shanten: std, handType: 'standard' };
  if (chiit <= kok) return { shanten: chiit, handType: 'chiitoitsu' };
  return { shanten: kok, handType: 'kokushi' };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

---

## Task 3: Write and run tests

**Files:**
- Create: `lib/shanten.test.ts`

- [ ] **Step 1: Write `lib/shanten.test.ts`**

```typescript
// lib/shanten.test.ts

import { describe, it, expect } from 'vitest';
import { calcShanten } from './shanten';
import { Tile, WindValue, DragonValue } from './types';

let _id = 0;
function t(suit: 'man' | 'pin' | 'sou', value: number, isRed = false): Tile {
  return { suit, value, isRed, id: `t${++_id}` };
}
function w(value: WindValue): Tile {
  return { suit: 'wind', value, isRed: false, id: `t${++_id}` };
}
function d(value: DragonValue): Tile {
  return { suit: 'dragon', value, isRed: false, id: `t${++_id}` };
}

describe('calcShanten — standard hand', () => {
  it('complete hand (14 tiles): shanten -1', () => {
    // 1m2m3m 4p5p6p 7s8s9s EEE RR
    const hand: Tile[] = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(-1);
    expect(r.handType).toBe('standard');
  });

  it('tenpai (13 tiles): shanten 0', () => {
    // 1m2m3m 4p5p6p 7s8s9s EE RR — 3 melds + pair (EE) + taatsu (RR)
    const hand: Tile[] = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(0);
    expect(r.handType).toBe('standard');
  });

  it('1-shanten (13 tiles): shanten 1', () => {
    // 1m2m3m 4p5p6p 7s8s EE RR W — 2 melds + 2 taatsu (7s8s, RR) + pair (EE) + float (W)
    const hand: Tile[] = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8),
      w('east'), w('east'),
      d('red'), d('red'),
      w('west'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(1);
  });
});

describe('calcShanten — chiitoitsu (seven pairs)', () => {
  it('tenpai (13 tiles): shanten 0', () => {
    // 11m 22p 33s 44m 55p 66s 7m — 6 pairs + 1 floating
    const hand: Tile[] = [
      t('man', 1), t('man', 1),
      t('pin', 2), t('pin', 2),
      t('sou', 3), t('sou', 3),
      t('man', 4), t('man', 4),
      t('pin', 5), t('pin', 5),
      t('sou', 6), t('sou', 6),
      t('man', 7),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(0);
    expect(r.handType).toBe('chiitoitsu');
  });

  it('complete (14 tiles): shanten -1', () => {
    // 11m 22p 33s 44m 55p 66s 77m — 7 pairs
    const hand: Tile[] = [
      t('man', 1), t('man', 1),
      t('pin', 2), t('pin', 2),
      t('sou', 3), t('sou', 3),
      t('man', 4), t('man', 4),
      t('pin', 5), t('pin', 5),
      t('sou', 6), t('sou', 6),
      t('man', 7), t('man', 7),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(-1);
    expect(r.handType).toBe('chiitoitsu');
  });
});

describe('calcShanten — kokushi (thirteen orphans)', () => {
  it('tenpai (13 tiles, all 13 unique orphans): shanten 0', () => {
    // 1m 9m 1p 9p 1s 9s E S W N R G Wh
    const hand: Tile[] = [
      t('man', 1), t('man', 9),
      t('pin', 1), t('pin', 9),
      t('sou', 1), t('sou', 9),
      w('east'), w('south'), w('west'), w('north'),
      d('red'), d('green'), d('white'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(0);
    expect(r.handType).toBe('kokushi');
  });

  it('1-shanten (12 unique orphans, no pair): shanten 1', () => {
    // 1m 9m 1p 9p 1s 9s E S W N R G 2m — missing Wh, 2m is non-orphan
    const hand: Tile[] = [
      t('man', 1), t('man', 9),
      t('pin', 1), t('pin', 9),
      t('sou', 1), t('sou', 9),
      w('east'), w('south'), w('west'), w('north'),
      d('red'), d('green'),
      t('man', 2),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(1);
    expect(r.handType).toBe('kokushi');
  });
});
```

- [ ] **Step 2: Run tests — expect all to pass**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm test
```

Expected output:
```
✓ lib/shanten.test.ts (7)
  ✓ calcShanten — standard hand (3)
  ✓ calcShanten — chiitoitsu (seven pairs) (2)
  ✓ calcShanten — kokushi (thirteen orphans) (2)

Test Files  1 passed (1)
Tests       7 passed (7)
```

If any test fails, read the failure message, check the shanten formula or tile index mapping, and fix `lib/shanten.ts`.

---

## Task 4: ShantenPanel component

**Files:**
- Create: `components/game/ShantenPanel.tsx`

- [ ] **Step 1: Create `components/game/ShantenPanel.tsx`**

```tsx
// components/game/ShantenPanel.tsx
'use client';

import { useMemo } from 'react';
import { Tile, Meld } from '@/lib/types';
import { calcShanten, HandType } from '@/lib/shanten';

interface ShantenPanelProps {
  hand: Tile[];
  melds: Meld[];
}

const HAND_TYPE_LABELS: Record<HandType, string> = {
  standard: 'Standard',
  chiitoitsu: 'Seven Pairs',
  kokushi: 'Thirteen Orphans',
};

export function ShantenPanel({ hand, melds }: ShantenPanelProps) {
  const result = useMemo(() => calcShanten(hand, melds), [hand, melds]);

  if (hand.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Current Status
        </h3>
        <p className="text-xs text-gray-600 italic">No tiles in hand.</p>
      </div>
    );
  }

  const { shanten, handType } = result;

  if (shanten === -1) {
    return (
      <div className="rounded-xl border border-yellow-500/60 bg-yellow-900/20 p-4 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Current Status
        </h3>
        <p className="text-xl font-bold text-yellow-300">Winning Hand</p>
        <p className="text-sm text-yellow-600">{HAND_TYPE_LABELS[handType]}</p>
      </div>
    );
  }

  if (shanten === 0) {
    return (
      <div className="rounded-xl border border-green-500/60 bg-green-900/20 p-4 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Current Status
        </h3>
        <p className="text-xl font-bold text-green-300">Tenpai</p>
        <p className="text-sm text-green-600">Hand Type: {HAND_TYPE_LABELS[handType]}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800 p-4 space-y-1">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Current Status
      </h3>
      <p className="text-base font-semibold text-white">
        Shanten: <span className="text-blue-400 text-xl font-bold">{shanten}</span>
      </p>
      <p className="text-sm text-gray-400">Hand Type: {HAND_TYPE_LABELS[handType]}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

---

## Task 5: Wire ShantenPanel into Game Table page

**Files:**
- Modify: `app/game/page.tsx`

The center `<main>` block currently contains `<ActionPanel .../>` then `<RecommendedAction />`. Replace `<RecommendedAction />` with `<ShantenPanel hand={state.player.hand} melds={state.player.melds} />`.

- [ ] **Step 1: Read `app/game/page.tsx`** (required before editing)

- [ ] **Step 2: Replace `RecommendedAction` import with `ShantenPanel`**

Find:
```tsx
import { RecommendedAction } from '@/components/game/RecommendedAction';
```

Replace with:
```tsx
import { ShantenPanel } from '@/components/game/ShantenPanel';
```

- [ ] **Step 3: Replace `<RecommendedAction />` with `<ShantenPanel>`**

Find (inside the `<main>` block):
```tsx
          <RecommendedAction />
```

Replace with:
```tsx
          <ShantenPanel hand={state.player.hand} melds={state.player.melds} />
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify production build**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm run build
```

Expected: All 3 routes compile successfully.

- [ ] **Step 6: Run tests to confirm nothing regressed**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm test
```

Expected: 7 tests pass.

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Standard hand shanten | Task 2 — `standardShanten` |
| Chiitoitsu shanten | Task 2 — `chiitoitsuShanten` |
| Kokushi shanten | Task 2 — `kokushiShanten` |
| Shanten number output | Task 2 — `calcShanten` |
| Best hand type output | Task 2 — `calcShanten` tie-break |
| Distance from tenpai | Task 2 — shanten = 0 means tenpai |
| Display: Shanten N + Hand Type | Task 4 — ShantenPanel (shanten > 0 branch) |
| Display: Tenpai | Task 4 — ShantenPanel (shanten = 0 branch) |
| Display: Winning Hand (shanten -1) | Task 4 — ShantenPanel (shanten = -1 branch) |
| Test: Complete hand | Task 3 — "complete hand (14 tiles)" |
| Test: Tenpai hand | Task 3 — "tenpai (13 tiles)" |
| Test: 1-shanten | Task 3 — "1-shanten (13 tiles)" |
| Test: Seven pairs | Task 3 — chiitoitsu describe block (tenpai + complete) |
| Test: Thirteen orphans | Task 3 — kokushi describe block (tenpai + 1-shanten) |
| Shanten Panel on Game Table | Task 5 — wired into `app/game/page.tsx` |
| No yaku or scoring | Not implemented ✓ |
| Deterministic TypeScript, no AI | Pure algorithm in `lib/shanten.ts` ✓ |
| Open melds handled | Task 2 — `baseMentsu` param; chiitoitsu/kokushi blocked when melds > 0 |
