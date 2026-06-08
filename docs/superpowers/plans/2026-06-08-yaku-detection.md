# Yaku Detection — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic yaku detection to the Riichi Mahjong Coach: confirmed yaku on complete hands, possible yaku on partial hands, no-yaku warnings, estimated han, and meld safety checks.

**Architecture:** A pure `lib/yaku.ts` module does all detection. It imports `calcShanten` from `lib/shanten.ts` (no circular dependency) and uses the same tile-index scheme (0–33). A `YakuPanel` component renders results below `ShantenPanel`. ActionPanel is extended to call a `checkMeldWarning` callback before confirming any chi/pon/kan.

**Tech Stack:** TypeScript, React 19 `useMemo`/`useCallback`, Vitest, existing `lib/types.ts` and `lib/shanten.ts`.

---

## Tile Index Reference (same as shanten.ts)

| Index | Tile |
|-------|------|
| 0–8   | man 1–9 |
| 9–17  | pin 1–9 |
| 18–26 | sou 1–9 |
| 27–30 | East, South, West, North |
| 31–33 | Red dragon, Green dragon, White dragon |

**Dora indicator → actual dora:**
- Suited: indicator index + 1 within suit (9m wraps to 1m)
- Winds: E→S→W→N→E (27→28→29→30→27)
- Dragons: R→G→W→R (31→32→33→31)

**`doraTiles` in `GameConfig`** are the indicator tile objects (what the player sees face-up). The actual dora is indicator+1. `detectDora` must convert using `doraFromIndicator`.

---

## Yaku Reference

| Yaku | Han (closed / open) | Key condition |
|------|---------------------|---------------|
| Riichi | 1 | `isRiichi` flag |
| Menzen Tsumo | 1 | `isTsumo` + no open melds |
| Pinfu | 1 / — | All sequences, non-yakuhai pair, closed |
| Iipeikou | 1 / — | Two identical sequences, closed |
| Tanyao | 1 | All tiles 2–8, no terminals/honors |
| Yakuhai | 1 per set | Triplet of dragon / seat / round wind |
| Toitoi | 2 | All triplets (hand + melds) |
| Chiitoitsu | 2 / — | Exactly 7 distinct pairs, closed |
| Honitsu | 3 / 2 | One suit + honors |
| Chinitsu | 6 / 5 | One suit only |
| Ittsu | 2 / 1 | 123+456+789 in same suit |
| Sanshoku Doujun | 2 / 1 | Same sequence in man, pin, sou |
| Dora | 1 per tile | Tile index == indicator+1 |
| Red Dora | 1 per tile | `tile.isRed === true` |

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `lib/yaku.ts` | Create | All yaku types, decomposition, detection, han |
| `lib/yaku.test.ts` | Create | Tests for every yaku + checkMeld |
| `components/game/YakuPanel.tsx` | Create | Display confirmed/possible yaku, han, warnings |
| `app/game/page.tsx` | Modify | Compute `checkMeldWarning`, add `YakuPanel` to center panel |
| `components/game/ActionPanel.tsx` | Modify | Accept + call `checkMeldWarning`, show meld safety warning |

---

## Task 1: `lib/yaku.ts`

**Files:**
- Create: `lib/yaku.ts`

- [ ] **Step 1: Write the failing test sentinel**

Create `lib/yaku.test.ts` with just the import so TypeScript fails to compile until the module exists:

```typescript
// lib/yaku.test.ts
import { calcYaku } from './yaku';
```

Run:
```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit 2>&1 | head -5
```
Expected: error `Cannot find module './yaku'`.

- [ ] **Step 2: Create `lib/yaku.ts`**

```typescript
// lib/yaku.ts

import { Tile, Meld, WindValue, DragonValue } from './types';
import { calcShanten } from './shanten';

// ── Types ─────────────────────────────────────────────────────────────────

export type YakuName =
  | 'riichi' | 'menzen-tsumo' | 'pinfu' | 'iipeikou'
  | 'tanyao' | 'yakuhai' | 'toitoi' | 'chiitoitsu'
  | 'honitsu' | 'chinitsu' | 'ittsu' | 'sanshoku-doujun'
  | 'dora' | 'red-dora';

export interface YakuEntry {
  name: YakuName;
  han: number;
}

export interface YakuResult {
  /** Yaku present on a complete hand (shanten === -1). Empty otherwise. */
  confirmed: YakuEntry[];
  /** Yaku consistent with the current partial hand (shanten >= 0). Empty when confirmed is populated. */
  possible: YakuEntry[];
  /** Sum of han for confirmed yaku (0 when not complete). */
  totalHan: number;
  /** True when the complete hand has at least one non-dora yaku. */
  hasYaku: boolean;
  /** True when shanten === -1 but no non-dora yaku exists. */
  noYakuWarning: boolean;
}

export interface MeldCheckResult {
  hasYakuAfter: boolean;
  /** Non-null warning string when calling would leave no achievable yaku. */
  warning: string | null;
}

export interface YakuContext {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  /** Dora indicator tiles (actual dora = indicator + 1). */
  doraTiles: Tile[];
  isRiichi: boolean;
  isTsumo: boolean;
}

// ── Tile helpers ──────────────────────────────────────────────────────────

const WIND_IDX: Record<WindValue, number> = { east: 0, south: 1, west: 2, north: 3 };
const DRAGON_IDX: Record<DragonValue, number> = { red: 0, green: 1, white: 2 };

function tileToIndex(tile: Tile): number {
  if (tile.suit === 'man') return (tile.value as number) - 1;
  if (tile.suit === 'pin') return 9 + (tile.value as number) - 1;
  if (tile.suit === 'sou') return 18 + (tile.value as number) - 1;
  if (tile.suit === 'wind') return 27 + WIND_IDX[tile.value as WindValue];
  return 31 + DRAGON_IDX[tile.value as DragonValue];
}

function isHonor(idx: number): boolean { return idx >= 27; }
function isTerminalOrHonor(idx: number): boolean {
  return isHonor(idx) || idx % 9 === 0 || idx % 9 === 8;
}
function isSimple(idx: number): boolean { return !isTerminalOrHonor(idx); }
function getSuit(idx: number): number { return isHonor(idx) ? -1 : Math.floor(idx / 9); }

function isYakuhaiIndex(idx: number, seatWind: WindValue, roundWind: WindValue): boolean {
  if (idx >= 31) return true; // dragons always yakuhai
  if (idx >= 27) {
    const w = idx - 27;
    return w === WIND_IDX[seatWind] || w === WIND_IDX[roundWind];
  }
  return false;
}

function buildCounts(tiles: Tile[]): number[] {
  const c = new Array(34).fill(0);
  for (const t of tiles) c[tileToIndex(t)]++;
  return c;
}

// ── Dora conversion ───────────────────────────────────────────────────────

function doraFromIndicator(indicator: Tile): number {
  const idx = tileToIndex(indicator);
  if (idx >= 31) return idx === 33 ? 31 : idx + 1;       // dragon cycle R→G→W→R
  if (idx >= 27) return idx === 30 ? 27 : idx + 1;       // wind cycle N→E
  const base = Math.floor(idx / 9) * 9;
  return base + (idx % 9 === 8 ? 0 : idx % 9 + 1);      // suit cycle 9→1
}

// ── Hand decomposition (complete hands only) ──────────────────────────────

interface MentsuInfo {
  type: 'triplet' | 'sequence';
  startIndex: number; // lowest tile-index in the block
}

interface Decomposition {
  mentsu: MentsuInfo[];
  jantai: number; // tile index of the pair
}

function findDecompositions(handCounts: number[], openMeldCount: number): Decomposition[] {
  const results: Decomposition[] = [];
  const counts = [...handCounts];
  const needed = 4 - openMeldCount;

  for (let j = 0; j < 34; j++) {
    if (counts[j] < 2) continue;
    counts[j] -= 2;
    collectMentsu(counts, needed, [], results, j);
    counts[j] += 2;
  }
  return results;
}

function collectMentsu(
  counts: number[],
  needed: number,
  blocks: MentsuInfo[],
  results: Decomposition[],
  jantai: number
): void {
  if (needed === 0) {
    if (counts.every(c => c === 0)) results.push({ mentsu: [...blocks], jantai });
    return;
  }
  let i = 0;
  while (i < 34 && counts[i] === 0) i++;
  if (i >= 34) return;

  // Triplet
  if (counts[i] >= 3) {
    counts[i] -= 3;
    blocks.push({ type: 'triplet', startIndex: i });
    collectMentsu(counts, needed - 1, blocks, results, jantai);
    blocks.pop();
    counts[i] += 3;
  }
  // Sequence (suited only, pos 0–6 within suit)
  if (!isHonor(i) && i % 9 <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i]--; counts[i + 1]--; counts[i + 2]--;
    blocks.push({ type: 'sequence', startIndex: i });
    collectMentsu(counts, needed - 1, blocks, results, jantai);
    blocks.pop();
    counts[i]++; counts[i + 1]++; counts[i + 2]++;
  }
}

// ── Individual yaku detectors ─────────────────────────────────────────────

function chkRiichi(ctx: YakuContext): YakuEntry | null {
  return ctx.isRiichi ? { name: 'riichi', han: 1 } : null;
}

function chkMenzenTsumo(ctx: YakuContext, openMelds: number): YakuEntry | null {
  return ctx.isTsumo && openMelds === 0 ? { name: 'menzen-tsumo', han: 1 } : null;
}

function chkPinfu(
  decomp: Decomposition,
  openMelds: number,
  seatWind: WindValue,
  roundWind: WindValue
): YakuEntry | null {
  if (openMelds > 0) return null;
  if (!decomp.mentsu.every(m => m.type === 'sequence')) return null;
  if (isYakuhaiIndex(decomp.jantai, seatWind, roundWind)) return null;
  // Any valid sequence allows a ryanmen wait (pos 0–6 in suit)
  return { name: 'pinfu', han: 1 };
}

function chkIipeikou(decomp: Decomposition, openMelds: number): YakuEntry | null {
  if (openMelds > 0) return null;
  const seqs = decomp.mentsu.filter(m => m.type === 'sequence').map(m => m.startIndex);
  const counts = new Map<number, number>();
  for (const s of seqs) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.values()].some(n => n >= 2) ? { name: 'iipeikou', han: 1 } : null;
}

function chkTanyao(ctx: YakuContext): YakuEntry | null {
  const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)];
  return all.every(t => isSimple(tileToIndex(t))) ? { name: 'tanyao', han: 1 } : null;
}

function chkYakuhaiFromDecomp(
  decomp: Decomposition,
  ctx: YakuContext
): YakuEntry[] {
  return decomp.mentsu
    .filter(m => m.type === 'triplet' && isYakuhaiIndex(m.startIndex, ctx.seatWind, ctx.roundWind))
    .map(() => ({ name: 'yakuhai' as YakuName, han: 1 }));
}

function chkYakuhaiFromOpenMelds(ctx: YakuContext): YakuEntry[] {
  return ctx.melds
    .filter(m => (m.type === 'pon' || m.type === 'kan') &&
      isYakuhaiIndex(tileToIndex(m.tiles[0]), ctx.seatWind, ctx.roundWind))
    .map(() => ({ name: 'yakuhai' as YakuName, han: 1 }));
}

function chkToitoi(decomp: Decomposition, ctx: YakuContext): YakuEntry | null {
  const handOk = decomp.mentsu.every(m => m.type === 'triplet');
  const meldsOk = ctx.melds.every(
    m => m.type === 'pon' || m.type === 'kan' || m.type === 'closed-kan'
  );
  return handOk && meldsOk ? { name: 'toitoi', han: 2 } : null;
}

function chkChiitoitsu(ctx: YakuContext): YakuEntry | null {
  if (ctx.melds.length > 0 || ctx.hand.length !== 14) return null;
  const counts = buildCounts(ctx.hand);
  // Exactly 7 distinct pairs (each tile appears exactly 2 times)
  const pairs = counts.filter(c => c === 2).length;
  return pairs === 7 ? { name: 'chiitoitsu', han: 2 } : null;
}

function chkHonitsu(ctx: YakuContext, openMelds: number): YakuEntry | null {
  const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)];
  const suits = new Set(all.map(t => getSuit(tileToIndex(t))).filter(s => s >= 0));
  if (suits.size !== 1) return null;
  const hasHonors = all.some(t => isHonor(tileToIndex(t)));
  if (!hasHonors) return null; // chinitsu, not honitsu
  return { name: 'honitsu', han: openMelds > 0 ? 2 : 3 };
}

function chkChinitsu(ctx: YakuContext, openMelds: number): YakuEntry | null {
  const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)];
  const suits = new Set(all.map(t => getSuit(tileToIndex(t))).filter(s => s >= 0));
  const hasHonors = all.some(t => isHonor(tileToIndex(t)));
  if (hasHonors || suits.size !== 1) return null;
  return { name: 'chinitsu', han: openMelds > 0 ? 5 : 6 };
}

function chkIttsu(decomp: Decomposition, ctx: YakuContext, openMelds: number): YakuEntry | null {
  const chiStartIndices = ctx.melds
    .filter(m => m.type === 'chi')
    .map(m => Math.min(...m.tiles.map(t => tileToIndex(t))));
  const allSeqs = [
    ...decomp.mentsu.filter(m => m.type === 'sequence').map(m => m.startIndex),
    ...chiStartIndices,
  ];
  for (let suit = 0; suit < 3; suit++) {
    const b = suit * 9;
    if (allSeqs.includes(b) && allSeqs.includes(b + 3) && allSeqs.includes(b + 6)) {
      return { name: 'ittsu', han: openMelds > 0 ? 1 : 2 };
    }
  }
  return null;
}

function chkSanshokuDoujun(
  decomp: Decomposition,
  ctx: YakuContext,
  openMelds: number
): YakuEntry | null {
  const chiStartIndices = ctx.melds
    .filter(m => m.type === 'chi')
    .map(m => Math.min(...m.tiles.map(t => tileToIndex(t))));
  const allSeqs = [
    ...decomp.mentsu.filter(m => m.type === 'sequence').map(m => m.startIndex),
    ...chiStartIndices,
  ];
  for (let pos = 0; pos <= 6; pos++) {
    if (allSeqs.includes(pos) && allSeqs.includes(9 + pos) && allSeqs.includes(18 + pos)) {
      return { name: 'sanshoku-doujun', han: openMelds > 0 ? 1 : 2 };
    }
  }
  return null;
}

function chkDora(ctx: YakuContext): YakuEntry | null {
  const doraIndices = ctx.doraTiles.map(doraFromIndicator);
  const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)];
  let count = 0;
  for (const tile of all) {
    const idx = tileToIndex(tile);
    count += doraIndices.filter(d => d === idx).length;
  }
  return count > 0 ? { name: 'dora', han: count } : null;
}

function chkRedDora(ctx: YakuContext): YakuEntry | null {
  const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)];
  const count = all.filter(t => t.isRed).length;
  return count > 0 ? { name: 'red-dora', han: count } : null;
}

// ── Possible yaku (partial hands) ────────────────────────────────────────

function possibleYaku(ctx: YakuContext): YakuEntry[] {
  const possible: YakuEntry[] = [];
  const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)];
  const openMelds = ctx.melds.filter(m => m.type !== 'closed-kan').length;

  if (ctx.isRiichi) possible.push({ name: 'riichi', han: 1 });
  if (openMelds === 0) possible.push({ name: 'menzen-tsumo', han: 1 });

  // Tanyao: all tiles so far are simples
  if (all.length > 0 && all.every(t => isSimple(tileToIndex(t)))) {
    possible.push({ name: 'tanyao', han: 1 });
  }

  // Yakuhai: >=2 of a yakuhai tile in hand, or already have a pon/kan of it
  const hc = buildCounts(ctx.hand);
  for (let idx = 27; idx < 34; idx++) {
    if (!isYakuhaiIndex(idx, ctx.seatWind, ctx.roundWind)) continue;
    const inMeld = ctx.melds.some(
      m => (m.type === 'pon' || m.type === 'kan') && tileToIndex(m.tiles[0]) === idx
    );
    if (inMeld || hc[idx] >= 2) possible.push({ name: 'yakuhai', han: 1 });
  }

  // Toitoi: all existing melds are triplets/kans
  if (
    ctx.melds.length > 0 &&
    ctx.melds.every(m => m.type === 'pon' || m.type === 'kan' || m.type === 'closed-kan')
  ) {
    possible.push({ name: 'toitoi', han: 2 });
  }

  // Chiitoitsu: 4+ distinct pairs in hand, no open melds
  if (openMelds === 0) {
    const pairs = hc.filter(c => c >= 2).length;
    if (pairs >= 4) possible.push({ name: 'chiitoitsu', han: 2 });
  }

  // Pinfu: closed, no triplets yet
  if (
    openMelds === 0 &&
    ctx.melds.length === 0 &&
    hc.every(c => c !== 3)
  ) {
    possible.push({ name: 'pinfu', han: 1 });
  }

  // Honitsu / Chinitsu
  if (all.length > 0) {
    const suits = new Set(all.map(t => getSuit(tileToIndex(t))).filter(s => s >= 0));
    const hasHonors = all.some(t => isHonor(tileToIndex(t)));
    if (suits.size === 1) {
      if (!hasHonors) possible.push({ name: 'chinitsu', han: openMelds > 0 ? 5 : 6 });
      else possible.push({ name: 'honitsu', han: openMelds > 0 ? 2 : 3 });
    }
  }

  const d = chkDora(ctx);
  if (d) possible.push(d);
  const r = chkRedDora(ctx);
  if (r) possible.push(r);

  return possible;
}

// ── Main API ──────────────────────────────────────────────────────────────

export function calcYaku(ctx: YakuContext): YakuResult {
  const { hand, melds, seatWind, roundWind } = ctx;
  const shantenResult = calcShanten(hand, melds);
  const shanten = shantenResult.shanten;
  const openMelds = melds.filter(m => m.type !== 'closed-kan').length;

  // Non-complete hand
  if (shanten !== -1) {
    const possible = possibleYaku(ctx);
    return { confirmed: [], possible, totalHan: 0, hasYaku: false, noYakuWarning: false };
  }

  // Complete hand — chiitoitsu first (no decomposition needed)
  const chiitsu = chkChiitoitsu(ctx);
  if (chiitsu) {
    const confirmed: YakuEntry[] = [chiitsu];
    if (ctx.isRiichi) confirmed.push({ name: 'riichi', han: 1 });
    const d = chkDora(ctx); if (d) confirmed.push(d);
    const r = chkRedDora(ctx); if (r) confirmed.push(r);
    const totalHan = confirmed.reduce((s, y) => s + y.han, 0);
    return { confirmed, possible: [], totalHan, hasYaku: true, noYakuWarning: false };
  }

  // Standard decomposition — pick decomposition yielding most han
  const handCounts = buildCounts(hand);
  const decomps = findDecompositions(handCounts, openMelds);
  if (decomps.length === 0) {
    return { confirmed: [], possible: [], totalHan: 0, hasYaku: false, noYakuWarning: true };
  }

  let bestConfirmed: YakuEntry[] = [];
  let bestHan = -1;

  for (const decomp of decomps) {
    const list: YakuEntry[] = [];

    const riichi = chkRiichi(ctx); if (riichi) list.push(riichi);
    const tsumo = chkMenzenTsumo(ctx, openMelds); if (tsumo) list.push(tsumo);
    const pinfu = chkPinfu(decomp, openMelds, seatWind, roundWind); if (pinfu) list.push(pinfu);
    const iipeikou = chkIipeikou(decomp, openMelds); if (iipeikou) list.push(iipeikou);
    const tanyao = chkTanyao(ctx); if (tanyao) list.push(tanyao);
    list.push(...chkYakuhaiFromOpenMelds(ctx));
    list.push(...chkYakuhaiFromDecomp(decomp, ctx));
    const toitoi = chkToitoi(decomp, ctx); if (toitoi) list.push(toitoi);
    const honitsu = chkHonitsu(ctx, openMelds); if (honitsu) list.push(honitsu);
    const chinitsu = chkChinitsu(ctx, openMelds); if (chinitsu) list.push(chinitsu);
    const ittsu = chkIttsu(decomp, ctx, openMelds); if (ittsu) list.push(ittsu);
    const sanshoku = chkSanshokuDoujun(decomp, ctx, openMelds); if (sanshoku) list.push(sanshoku);
    const d = chkDora(ctx); if (d) list.push(d);
    const r = chkRedDora(ctx); if (r) list.push(r);

    const han = list.reduce((s, y) => s + y.han, 0);
    if (han > bestHan) { bestHan = han; bestConfirmed = list; }
  }

  const hasYaku = bestConfirmed.some(y => y.name !== 'dora' && y.name !== 'red-dora');
  return {
    confirmed: bestConfirmed,
    possible: [],
    totalHan: bestHan,
    hasYaku,
    noYakuWarning: !hasYaku,
  };
}

export function checkMeld(ctx: YakuContext, proposedMeld: Meld): MeldCheckResult {
  const ctxAfter: YakuContext = {
    ...ctx,
    melds: [...ctx.melds, proposedMeld],
    isRiichi: false, // calling always loses riichi possibility
  };
  const possible = possibleYaku(ctxAfter);
  const hasYakuAfter = possible.some(y => y.name !== 'dora' && y.name !== 'red-dora');
  const warning = hasYakuAfter
    ? null
    : 'No yaku would remain after this call — do not open the hand.';
  return { hasYakuAfter, warning };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/yaku.ts && git commit -m "feat: yaku detection engine — 14 yaku, decomposition, han, meld check"
```

---

## Task 2: `lib/yaku.test.ts`

**Files:**
- Create: `lib/yaku.test.ts`

The test helpers `t`, `w`, `d` from `lib/shanten.test.ts` must be reproduced here (tests are independent).

- [ ] **Step 1: Write `lib/yaku.test.ts`**

```typescript
// lib/yaku.test.ts

import { describe, it, expect } from 'vitest';
import { calcYaku, checkMeld, YakuContext } from './yaku';
import { Tile, Meld, WindValue, DragonValue } from './types';

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

function ctx(
  hand: Tile[],
  overrides: Partial<YakuContext> = {}
): YakuContext {
  return {
    hand,
    melds: [],
    seatWind: 'east',
    roundWind: 'east',
    doraTiles: [],
    isRiichi: false,
    isTsumo: false,
    ...overrides,
  };
}

// ── Riichi ────────────────────────────────────────────────────────────────

describe('riichi', () => {
  it('confirmed when isRiichi=true and hand is tenpai', () => {
    // 1m2m3m 4p5p6p 7s8s9s EE RR — tenpai standard
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcYaku(ctx(hand, { isRiichi: true }));
    expect(r.possible.some(y => y.name === 'riichi')).toBe(true);
  });

  it('confirmed in yaku list when complete and isRiichi=true', () => {
    // Complete: 1m2m3m 4p5p6p 7s8s9s EEE RR
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcYaku(ctx(hand, { isRiichi: true }));
    expect(r.confirmed.some(y => y.name === 'riichi')).toBe(true);
  });
});

// ── Tanyao ────────────────────────────────────────────────────────────────

describe('tanyao', () => {
  it('confirmed on complete all-simples hand', () => {
    // 2m3m4m 5p6p7p 3s4s5s 6s6s 8m8m → wait... let me use a real tanyao complete hand
    // 2m3m4m 5m6m7m 2p3p4p 5p6p7p 3s3s
    const hand = [
      t('man', 2), t('man', 3), t('man', 4),
      t('man', 5), t('man', 6), t('man', 7),
      t('pin', 2), t('pin', 3), t('pin', 4),
      t('pin', 5), t('pin', 6), t('pin', 7),
      t('sou', 3), t('sou', 3),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'tanyao')).toBe(true);
    expect(r.hasYaku).toBe(true);
  });

  it('not present when hand contains terminals', () => {
    // Complete: 1m2m3m 4p5p6p 7s8s9s EEE RR
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'tanyao')).toBe(false);
  });
});

// ── Yakuhai ───────────────────────────────────────────────────────────────

describe('yakuhai', () => {
  it('confirmed when triplet of seat wind', () => {
    // EEE 1m2m3m 4p5p6p 7s8s9s GG (East seat, East round)
    const hand = [
      w('east'), w('east'), w('east'),
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      d('green'), d('green'),
    ];
    const r = calcYaku(ctx(hand, { seatWind: 'east', roundWind: 'east' }));
    expect(r.confirmed.some(y => y.name === 'yakuhai')).toBe(true);
  });

  it('not present for non-yakuhai wind triplet (west wind, east seat+round)', () => {
    // WWW 1m2m3m 4p5p6p 7s8s9s GG
    const hand = [
      w('west'), w('west'), w('west'),
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      d('green'), d('green'),
    ];
    const r = calcYaku(ctx(hand, { seatWind: 'east', roundWind: 'east' }));
    expect(r.confirmed.some(y => y.name === 'yakuhai')).toBe(false);
  });
});

// ── Pinfu ─────────────────────────────────────────────────────────────────

describe('pinfu', () => {
  it('confirmed: all sequences, non-yakuhai pair, closed', () => {
    // 1m2m3m 4p5p6p 7s8s9s 2m3m4m 5p5p
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      t('man', 2), t('man', 3), t('man', 4),
      t('pin', 5), t('pin', 5),
    ];
    const r = calcYaku(ctx(hand, { seatWind: 'south', roundWind: 'east' }));
    expect(r.confirmed.some(y => y.name === 'pinfu')).toBe(true);
  });

  it('not present when pair is yakuhai', () => {
    // Same hand but pair is EE (seat + round wind)
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      t('man', 2), t('man', 3), t('man', 4),
      w('east'), w('east'),
    ];
    const r = calcYaku(ctx(hand, { seatWind: 'east', roundWind: 'east' }));
    expect(r.confirmed.some(y => y.name === 'pinfu')).toBe(false);
  });
});

// ── Iipeikou ─────────────────────────────────────────────────────────────

describe('iipeikou', () => {
  it('confirmed: two identical sequences', () => {
    // 1m2m3m 1m2m3m 4p5p6p 7s8s9s 2p2p
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      t('pin', 2), t('pin', 2),
    ];
    const r = calcYaku(ctx(hand, { seatWind: 'south', roundWind: 'east' }));
    expect(r.confirmed.some(y => y.name === 'iipeikou')).toBe(true);
  });
});

// ── Toitoi ────────────────────────────────────────────────────────────────

describe('toitoi', () => {
  it('confirmed: all triplets', () => {
    // 111m 222p 333s 444m 55p
    const hand = [
      t('man', 1), t('man', 1), t('man', 1),
      t('pin', 2), t('pin', 2), t('pin', 2),
      t('sou', 3), t('sou', 3), t('sou', 3),
      t('man', 4), t('man', 4), t('man', 4),
      t('pin', 5), t('pin', 5),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'toitoi')).toBe(true);
  });
});

// ── Chiitoitsu ───────────────────────────────────────────────────────────

describe('chiitoitsu', () => {
  it('confirmed: 7 distinct pairs', () => {
    const hand = [
      t('man', 1), t('man', 1),
      t('pin', 2), t('pin', 2),
      t('sou', 3), t('sou', 3),
      t('man', 4), t('man', 4),
      t('pin', 5), t('pin', 5),
      t('sou', 6), t('sou', 6),
      t('man', 7), t('man', 7),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'chiitoitsu')).toBe(true);
    expect(r.hasYaku).toBe(true);
  });
});

// ── Honitsu ──────────────────────────────────────────────────────────────

describe('honitsu', () => {
  it('confirmed closed (3 han): one suit + honors', () => {
    // 1m2m3m 4m5m6m 7m8m9m EEE 1m1m
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 4), t('man', 5), t('man', 6),
      t('man', 7), t('man', 8), t('man', 9),
      w('east'), w('east'), w('east'),
      t('man', 1), t('man', 1),
    ];
    const r = calcYaku(ctx(hand, { seatWind: 'south', roundWind: 'east' }));
    expect(r.confirmed.some(y => y.name === 'honitsu' && y.han === 3)).toBe(true);
  });
});

// ── Chinitsu ─────────────────────────────────────────────────────────────

describe('chinitsu', () => {
  it('confirmed closed (6 han): one suit only', () => {
    // 1m2m3m 4m5m6m 7m8m9m 2m3m4m 5m5m
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 4), t('man', 5), t('man', 6),
      t('man', 7), t('man', 8), t('man', 9),
      t('man', 2), t('man', 3), t('man', 4),
      t('man', 5), t('man', 5),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'chinitsu' && y.han === 6)).toBe(true);
  });
});

// ── Ittsu ─────────────────────────────────────────────────────────────────

describe('ittsu', () => {
  it('confirmed closed (2 han): 123+456+789 in man', () => {
    // 1m2m3m 4m5m6m 7m8m9m 2p3p4p 5p5p
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 4), t('man', 5), t('man', 6),
      t('man', 7), t('man', 8), t('man', 9),
      t('pin', 2), t('pin', 3), t('pin', 4),
      t('pin', 5), t('pin', 5),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'ittsu' && y.han === 2)).toBe(true);
  });
});

// ── Sanshoku Doujun ───────────────────────────────────────────────────────

describe('sanshoku-doujun', () => {
  it('confirmed closed (2 han): 1-2-3 in man, pin, sou', () => {
    // 1m2m3m 1p2p3p 1s2s3s 4m5m6m 7m7m
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 1), t('pin', 2), t('pin', 3),
      t('sou', 1), t('sou', 2), t('sou', 3),
      t('man', 4), t('man', 5), t('man', 6),
      t('man', 7), t('man', 7),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'sanshoku-doujun' && y.han === 2)).toBe(true);
  });
});

// ── Dora ──────────────────────────────────────────────────────────────────

describe('dora', () => {
  it('counts dora tiles correctly (indicator = 5m → dora = 6m)', () => {
    // Indicator: 5m → actual dora: 6m
    // Hand contains two 6m
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 4), t('man', 5), t('man', 6),
      t('man', 6), t('man', 7), t('man', 8),
      t('pin', 2), t('pin', 3), t('pin', 4),
      t('pin', 5), t('pin', 5),
    ];
    const indicatorTile: Tile = { suit: 'man', value: 5, isRed: false, id: 'ind1' };
    const r = calcYaku(ctx(hand, { doraTiles: [indicatorTile] }));
    expect(r.confirmed.some(y => y.name === 'dora' && y.han === 2)).toBe(true);
  });
});

// ── Red Dora ──────────────────────────────────────────────────────────────

describe('red-dora', () => {
  it('counts red five tiles', () => {
    // Complete chinitsu-man hand with one red 5m
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 4), { suit: 'man', value: 5, isRed: true, id: 'r5m' } as Tile, t('man', 6),
      t('man', 7), t('man', 8), t('man', 9),
      t('man', 2), t('man', 3), t('man', 4),
      t('man', 5), t('man', 5),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.confirmed.some(y => y.name === 'red-dora' && y.han === 1)).toBe(true);
  });
});

// ── Han counting ──────────────────────────────────────────────────────────

describe('totalHan', () => {
  it('sums all confirmed yaku han correctly', () => {
    // Tanyao (1) + complete simples hand
    const hand = [
      t('man', 2), t('man', 3), t('man', 4),
      t('man', 5), t('man', 6), t('man', 7),
      t('pin', 2), t('pin', 3), t('pin', 4),
      t('pin', 5), t('pin', 6), t('pin', 7),
      t('sou', 3), t('sou', 3),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.totalHan).toBeGreaterThanOrEqual(1);
    expect(r.hasYaku).toBe(true);
  });
});

// ── No yaku warning ───────────────────────────────────────────────────────

describe('noYakuWarning', () => {
  it('warns when complete hand has only dora and no yaku', () => {
    // Mixed suit + terminal hand (no recognizable yaku) with one dora
    // 1m9m 1p9p 1s9s E S W N R G Wh Wh — kokushi tenpai... use a hand that's complete but no yaku
    // Actually: complete hand mixing suits + terminals = no yaku
    // 1m2m3m 1p2p3p 1s2s3s EEE 9m9m — mixed suits + terminals, no single-suit, no triplet-of-yakuhai
    // Wait, EEE as East seat=east round is yakuhai! Use non-yakuhai winds
    // 1m2m3m 1p2p3p 1s2s3s WWW 9m9m  (seat=east, round=east so W is not yakuhai)
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 1), t('pin', 2), t('pin', 3),
      t('sou', 1), t('sou', 2), t('sou', 3),
      w('west'), w('west'), w('west'),
      t('man', 9), t('man', 9),
    ];
    // Add a dora indicator pointing to 9m (so 9m is dora)
    const ind: Tile = { suit: 'man', value: 8, isRed: false, id: 'ind2' };
    const r = calcYaku(ctx(hand, { seatWind: 'east', roundWind: 'east', doraTiles: [ind] }));
    expect(r.noYakuWarning).toBe(true);
    expect(r.hasYaku).toBe(false);
  });
});

// ── checkMeld ─────────────────────────────────────────────────────────────

describe('checkMeld', () => {
  it('warns when calling chi on non-simple tiles destroys tanyao', () => {
    // Hand is tanyao-possible (all simples), calling chi on 1m-2m-3m (has terminal) breaks it
    const hand = [
      t('man', 2), t('man', 3), t('man', 4),
      t('pin', 2), t('pin', 2),
      t('sou', 2), t('sou', 2),
      t('man', 5), t('man', 5),
      t('pin', 3), t('pin', 4), t('sou', 3),
      t('pin', 6),
    ];
    const c = ctx(hand);
    const meld: Meld = {
      type: 'chi',
      tiles: [t('man', 1), t('man', 2), t('man', 3)], // has 1m (terminal)
    };
    const result = checkMeld(c, meld);
    expect(result.warning).not.toBeNull();
  });

  it('no warning when calling pon on east wind as east seat/round (yakuhai)', () => {
    // Hand working toward yakuhai — calling pon on east gives yakuhai
    const hand = [
      t('man', 2), t('man', 3), t('man', 4),
      t('pin', 2), t('pin', 3), t('pin', 4),
      t('sou', 2), t('sou', 3), t('sou', 4),
      t('man', 5), t('man', 5), t('man', 6),
      w('east'),
    ];
    const c = ctx(hand, { seatWind: 'east', roundWind: 'east' });
    const meld: Meld = {
      type: 'pon',
      tiles: [w('east'), w('east'), w('east')],
    };
    const result = checkMeld(c, meld);
    expect(result.hasYakuAfter).toBe(true);
    expect(result.warning).toBeNull();
  });
});

// ── Possible yaku (partial hand) ─────────────────────────────────────────

describe('possible yaku', () => {
  it('shows tanyao as possible when all current tiles are simples', () => {
    const hand = [
      t('man', 2), t('man', 3), t('man', 4),
      t('pin', 5), t('pin', 6),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.possible.some(y => y.name === 'tanyao')).toBe(true);
  });

  it('shows chinitsu as possible when all tiles are same suit', () => {
    const hand = [
      t('man', 1), t('man', 2), t('man', 3),
      t('man', 5), t('man', 7),
    ];
    const r = calcYaku(ctx(hand));
    expect(r.possible.some(y => y.name === 'chinitsu')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm test
```

Expected: all tests pass (will be ≥ 22 test cases). If any fail, read the failure and fix `lib/yaku.ts` (do not modify the tests).

- [ ] **Step 3: Commit**

```bash
git add lib/yaku.test.ts && git commit -m "test: yaku detection — all 14 yaku + checkMeld + possible yaku"
```

---

## Task 3: `components/game/YakuPanel.tsx`

**Files:**
- Create: `components/game/YakuPanel.tsx`

- [ ] **Step 1: Create `components/game/YakuPanel.tsx`**

```tsx
// components/game/YakuPanel.tsx
'use client';

import { useMemo } from 'react';
import { Tile, Meld, WindValue } from '@/lib/types';
import { calcYaku, YakuName, YakuEntry } from '@/lib/yaku';

interface YakuPanelProps {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  doraTiles: Tile[];
  isRiichi: boolean;
}

const YAKU_LABELS: Record<YakuName, string> = {
  'riichi': 'Riichi',
  'menzen-tsumo': 'Menzen Tsumo',
  'pinfu': 'Pinfu',
  'iipeikou': 'Iipeikou',
  'tanyao': 'Tanyao',
  'yakuhai': 'Yakuhai',
  'toitoi': 'Toitoi',
  'chiitoitsu': 'Chiitoitsu',
  'honitsu': 'Honitsu',
  'chinitsu': 'Chinitsu',
  'ittsu': 'Ittsu',
  'sanshoku-doujun': 'Sanshoku Doujun',
  'dora': 'Dora',
  'red-dora': 'Red Dora',
};

function YakuRow({ entry }: { entry: YakuEntry }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-200">{YAKU_LABELS[entry.name]}</span>
      <span className="text-blue-300 font-mono font-semibold tabular-nums">
        {entry.han} han
      </span>
    </div>
  );
}

export function YakuPanel({
  hand,
  melds,
  seatWind,
  roundWind,
  doraTiles,
  isRiichi,
}: YakuPanelProps) {
  const result = useMemo(
    () => calcYaku({ hand, melds, seatWind, roundWind, doraTiles, isRiichi, isTsumo: false }),
    [hand, melds, seatWind, roundWind, doraTiles, isRiichi]
  );

  if (hand.length === 0) return null;

  // Complete hand — confirmed yaku
  if (result.confirmed.length > 0 || result.noYakuWarning) {
    return (
      <div
        className={`rounded-xl border p-4 space-y-3 ${
          result.noYakuWarning
            ? 'border-red-500/60 bg-red-900/20'
            : 'border-indigo-500/60 bg-indigo-900/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Yaku</h3>
          {result.totalHan > 0 && (
            <span className="text-xs font-semibold text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded-full">
              {result.totalHan} han total
            </span>
          )}
        </div>

        {result.noYakuWarning ? (
          <p className="text-sm font-semibold text-red-400">
            ⚠ No yaku — this hand cannot win.
          </p>
        ) : (
          <div className="space-y-1.5">
            {result.confirmed.map((entry, i) => (
              <YakuRow key={`${entry.name}-${i}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Partial hand — possible yaku
  if (result.possible.length === 0) return null;

  const realPossible = result.possible.filter(y => y.name !== 'dora' && y.name !== 'red-dora');
  const bonusPossible = result.possible.filter(y => y.name === 'dora' || y.name === 'red-dora');

  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Possible Yaku
      </h3>
      {realPossible.length > 0 ? (
        <div className="space-y-1.5">
          {realPossible.map((entry, i) => (
            <YakuRow key={`${entry.name}-${i}`} entry={entry} />
          ))}
          {bonusPossible.map((entry, i) => (
            <YakuRow key={`bonus-${entry.name}-${i}`} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">No yaku on current tiles yet.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/game/YakuPanel.tsx && git commit -m "feat: YakuPanel — confirmed/possible yaku, han total, no-yaku warning"
```

---

## Task 4: Wire YakuPanel + ActionPanel meld warnings

**Files:**
- Modify: `app/game/page.tsx`
- Modify: `components/game/ActionPanel.tsx`

- [ ] **Step 1: Read both files before editing**

```bash
# Already familiar from earlier tasks, but required before any Edit call
```

Read `app/game/page.tsx` and `components/game/ActionPanel.tsx`.

- [ ] **Step 2: Update `components/game/ActionPanel.tsx`**

Add `checkMeldWarning` prop and warning UI. The full updated file:

```tsx
'use client';

import { useState } from 'react';
import { Tile, Meld } from '@/lib/types';
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
  checkMeldWarning: (meld: Meld) => string | null;
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
  checkMeldWarning,
}: ActionPanelProps) {
  const [activeInput, setActiveInput] = useState<ActiveInput>(null);
  const [meldInput, setMeldInput] = useState('');
  const [meldError, setMeldError] = useState('');
  const [meldWarning, setMeldWarning] = useState('');
  const [pendingMeld, setPendingMeld] = useState<{ type: 'chi' | 'pon' | 'kan'; tiles: Tile[] } | null>(null);

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
    setMeldWarning('');
    setPendingMeld(null);
  }

  function handleMeldSubmit() {
    setMeldError('');
    setMeldWarning('');
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
    } else if (activeInput === 'kan') {
      if (tiles.length !== 4) {
        setMeldError('Kan requires exactly 4 tiles.');
        return;
      }
    }

    if (!activeInput) return;

    const meld: Meld = { type: activeInput, tiles };
    const warning = checkMeldWarning(meld);

    if (warning) {
      setMeldWarning(warning);
      setPendingMeld({ type: activeInput, tiles });
      return;
    }

    confirmMeld(activeInput, tiles);
  }

  function confirmMeld(type: 'chi' | 'pon' | 'kan', tiles: Tile[]) {
    if (type === 'chi') onChi(tiles as [Tile, Tile, Tile]);
    else if (type === 'pon') onPon(tiles as [Tile, Tile, Tile]);
    else onKan(tiles);
    setActiveInput(null);
    setMeldInput('');
    setMeldWarning('');
    setPendingMeld(null);
  }

  function handleProceedAnyway() {
    if (!pendingMeld) return;
    confirmMeld(pendingMeld.type, pendingMeld.tiles);
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
              onChange={e => { setMeldInput(e.target.value); setMeldError(''); setMeldWarning(''); setPendingMeld(null); }}
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
          {meldWarning && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-amber-400 font-medium">⚠ {meldWarning}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleProceedAnyway}
                  className="px-3 py-1.5 bg-amber-700 text-white rounded text-xs font-semibold hover:bg-amber-800 transition-colors"
                >
                  Proceed Anyway
                </button>
                <button
                  type="button"
                  onClick={() => { setMeldWarning(''); setPendingMeld(null); }}
                  className="px-3 py-1.5 bg-gray-600 text-gray-300 rounded text-xs hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `app/game/page.tsx`**

Add these imports at the top (after existing imports):

```tsx
import { useCallback } from 'react';
import { Meld } from '@/lib/types';
import { checkMeld } from '@/lib/yaku';
import { YakuPanel } from '@/components/game/YakuPanel';
```

Inside the `GameTable` component, after the existing handler functions and before the return statement, add:

```tsx
  const checkMeldWarning = useCallback(
    (meld: Meld): string | null => {
      const result = checkMeld(
        {
          hand: state.player.hand,
          melds: state.player.melds,
          seatWind: state.player.seatWind,
          roundWind: state.config.roundWind,
          doraTiles: state.config.doraTiles,
          isRiichi: state.player.isRiichi,
          isTsumo: false,
        },
        meld
      );
      return result.warning;
    },
    [state]
  );
```

In the JSX, update the `<ActionPanel>` call to pass `checkMeldWarning`:

```tsx
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
            checkMeldWarning={checkMeldWarning}
          />
```

After the existing `<ShantenPanel .../>` line, add:

```tsx
          <YakuPanel
            hand={state.player.hand}
            melds={state.player.melds}
            seatWind={state.player.seatWind}
            roundWind={state.config.roundWind}
            doraTiles={state.config.doraTiles}
            isRiichi={state.player.isRiichi}
          />
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify production build**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm run build
```

Expected: All routes build successfully.

- [ ] **Step 6: Run all tests**

```bash
cd /home/robertnguyen/riichi-mahjong-coach && npm test
```

Expected: All tests pass (7 shanten + 22+ yaku tests).

- [ ] **Step 7: Commit**

```bash
git add app/game/page.tsx components/game/ActionPanel.tsx
git commit -m "feat: wire YakuPanel and meld-safety warnings into game page"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Riichi | Task 1 `chkRiichi` |
| Menzen Tsumo | Task 1 `chkMenzenTsumo` |
| Pinfu | Task 1 `chkPinfu` |
| Iipeikou | Task 1 `chkIipeikou` |
| Tanyao | Task 1 `chkTanyao` |
| Yakuhai | Task 1 `chkYakuhaiFromDecomp` + `chkYakuhaiFromOpenMelds` |
| Toitoi | Task 1 `chkToitoi` |
| Chiitoitsu | Task 1 `chkChiitoitsu` |
| Honitsu | Task 1 `chkHonitsu` |
| Chinitsu | Task 1 `chkChinitsu` |
| Ittsu | Task 1 `chkIttsu` |
| Sanshoku Doujun | Task 1 `chkSanshokuDoujun` |
| Dora | Task 1 `chkDora` + `doraFromIndicator` |
| Red Dora | Task 1 `chkRedDora` |
| Current possible yaku | Task 1 `possibleYaku` → Task 3 YakuPanel |
| Confirmed yaku (complete) | Task 1 `calcYaku` shanten=-1 path → Task 3 |
| No yaku warning | Task 1 `noYakuWarning` → Task 3 red banner |
| Opening hand loses yaku | Task 1 `checkMeld` → Task 4 ActionPanel warning |
| Estimated han | Task 1 `totalHan` → Task 3 YakuPanel header |
| Deterministic TypeScript, no AI | Pure algorithm ✓ |
| Tests for all yaku | Task 2 ✓ |

### Type Consistency Check

- `YakuName` string union used consistently in `YakuEntry`, `YAKU_LABELS`, tests ✓
- `YakuContext` interface matches all callers in `calcYaku`, `checkMeld`, `possibleYaku` ✓
- `findDecompositions(handCounts, openMeldCount)` — `openMeldCount` is `melds.filter(m => m.type !== 'closed-kan').length` in caller ✓
- `chkIttsu` and `chkSanshokuDoujun` use `Math.min(...meld.tiles.map(tileToIndex))` for chi meld start index ✓
- `YakuPanel` props match `GameTable` call site ✓
- `ActionPanel` `checkMeldWarning` prop type `(meld: Meld) => string | null` matches `checkMeldWarning` closure ✓
