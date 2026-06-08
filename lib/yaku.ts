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
  // Any valid sequence (pos 0–6 in suit) allows a ryanmen wait
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
