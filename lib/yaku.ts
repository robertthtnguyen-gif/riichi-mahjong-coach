import { Meld, Tile, WindValue, DragonValue } from './types';
import { calcShanten } from './shanten';

export type YakuName =
  | 'riichi'
  | 'menzen-tsumo'
  | 'tanyao'
  | 'pinfu'
  | 'yakuhai'
  | 'iipeikou'
  | 'chiitoitsu'
  | 'toitoi'
  | 'honitsu'
  | 'chinitsu'
  | 'ittsu'
  | 'sanshoku-doujun'
  | 'dora'
  | 'red-dora';

export interface YakuEntry {
  name: YakuName;
  han: number;
}

export interface YakuDetectionResult {
  yaku: YakuEntry[];
  han: number;
  warnings: string[];
}

export interface YakuContext {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  doraTiles: Tile[];
  isRiichi: boolean;
  isTsumo: boolean;
}

export interface PossibleYakuOptions {
  openTanyaoEnabled?: boolean;
}

const YAKU_ORDER: YakuName[] = [
  'riichi',
  'menzen-tsumo',
  'tanyao',
  'pinfu',
  'yakuhai',
  'iipeikou',
  'chiitoitsu',
  'toitoi',
  'honitsu',
  'chinitsu',
  'ittsu',
  'sanshoku-doujun',
  'dora',
  'red-dora',
];

const WIND_IDX: Record<WindValue, number> = { east: 0, south: 1, west: 2, north: 3 };
const DRAGON_IDX: Record<DragonValue, number> = { red: 0, green: 1, white: 2 };

interface MentsuInfo {
  type: 'triplet' | 'sequence';
  startIndex: number;
}

interface Decomposition {
  mentsu: MentsuInfo[];
  jantou: number;
}

function tileToIndex(tile: Tile): number {
  if (tile.suit === 'man') return (tile.value as number) - 1;
  if (tile.suit === 'pin') return 9 + (tile.value as number) - 1;
  if (tile.suit === 'sou') return 18 + (tile.value as number) - 1;
  if (tile.suit === 'wind') return 27 + WIND_IDX[tile.value as WindValue];
  return 31 + DRAGON_IDX[tile.value as DragonValue];
}

function buildCounts(tiles: Tile[]): number[] {
  const counts = new Array(34).fill(0);
  for (const tile of tiles) {
    counts[tileToIndex(tile)] += 1;
  }
  return counts;
}

function isHonor(index: number): boolean {
  return index >= 27;
}

function isTerminalOrHonor(index: number): boolean {
  return isHonor(index) || index % 9 === 0 || index % 9 === 8;
}

function isSimple(index: number): boolean {
  return !isTerminalOrHonor(index);
}

function getSuit(index: number): number {
  return isHonor(index) ? -1 : Math.floor(index / 9);
}

function isYakuhaiIndex(index: number, seatWind: WindValue, roundWind: WindValue): boolean {
  if (index >= 31) {
    return true;
  }
  if (index >= 27) {
    const windIndex = index - 27;
    return windIndex === WIND_IDX[seatWind] || windIndex === WIND_IDX[roundWind];
  }
  return false;
}

function doraFromIndicator(indicator: Tile): number {
  const index = tileToIndex(indicator);
  if (index >= 31) return index === 33 ? 31 : index + 1;
  if (index >= 27) return index === 30 ? 27 : index + 1;
  const base = Math.floor(index / 9) * 9;
  return base + (index % 9 === 8 ? 0 : index % 9 + 1);
}

function findDecompositions(handCounts: number[], openMeldCount: number): Decomposition[] {
  const results: Decomposition[] = [];
  const counts = [...handCounts];
  const neededMentsu = 4 - openMeldCount;

  for (let pairIndex = 0; pairIndex < 34; pairIndex += 1) {
    if (counts[pairIndex] < 2) {
      continue;
    }
    counts[pairIndex] -= 2;
    collectMentsu(counts, neededMentsu, [], results, pairIndex);
    counts[pairIndex] += 2;
  }

  return results;
}

function collectMentsu(
  counts: number[],
  neededMentsu: number,
  blocks: MentsuInfo[],
  results: Decomposition[],
  pairIndex: number
): void {
  if (neededMentsu === 0) {
    if (counts.every(count => count === 0)) {
      results.push({ mentsu: [...blocks], jantou: pairIndex });
    }
    return;
  }

  let index = 0;
  while (index < 34 && counts[index] === 0) {
    index += 1;
  }
  if (index >= 34) {
    return;
  }

  if (counts[index] >= 3) {
    counts[index] -= 3;
    blocks.push({ type: 'triplet', startIndex: index });
    collectMentsu(counts, neededMentsu - 1, blocks, results, pairIndex);
    blocks.pop();
    counts[index] += 3;
  }

  if (!isHonor(index) && index % 9 <= 6 && counts[index + 1] > 0 && counts[index + 2] > 0) {
    counts[index] -= 1;
    counts[index + 1] -= 1;
    counts[index + 2] -= 1;
    blocks.push({ type: 'sequence', startIndex: index });
    collectMentsu(counts, neededMentsu - 1, blocks, results, pairIndex);
    blocks.pop();
    counts[index] += 1;
    counts[index + 1] += 1;
    counts[index + 2] += 1;
  }
}

function getOpenMeldCount(melds: Meld[]): number {
  return melds.filter(meld => meld.type !== 'closed-kan').length;
}

function aggregateYaku(entries: YakuEntry[]): YakuEntry[] {
  const totals = new Map<YakuName, number>();

  for (const entry of entries) {
    totals.set(entry.name, (totals.get(entry.name) ?? 0) + entry.han);
  }

  return YAKU_ORDER
    .filter(name => totals.has(name))
    .map(name => ({ name, han: totals.get(name)! }));
}

function hasNonDoraYaku(entries: YakuEntry[]): boolean {
  return entries.some(entry => entry.name !== 'dora' && entry.name !== 'red-dora');
}

function createResult(entries: YakuEntry[], warnings: string[] = []): YakuDetectionResult {
  const yaku = aggregateYaku(entries);
  const han = yaku.reduce((total, entry) => total + entry.han, 0);
  return { yaku, han, warnings };
}

function evaluateUniversalYaku(ctx: YakuContext, openMeldCount: number): YakuEntry[] {
  const entries: YakuEntry[] = [];
  const allTiles = [...ctx.hand, ...ctx.melds.flatMap(meld => meld.tiles)];

  if (ctx.isRiichi) {
    entries.push({ name: 'riichi', han: 1 });
  }

  if (ctx.isTsumo && openMeldCount === 0) {
    entries.push({ name: 'menzen-tsumo', han: 1 });
  }

  if (allTiles.every(tile => isSimple(tileToIndex(tile)))) {
    entries.push({ name: 'tanyao', han: 1 });
  }

  const suits = new Set(allTiles.map(tile => getSuit(tileToIndex(tile))).filter(suit => suit >= 0));
  const hasHonors = allTiles.some(tile => isHonor(tileToIndex(tile)));
  if (suits.size === 1 && hasHonors) {
    entries.push({ name: 'honitsu', han: openMeldCount > 0 ? 2 : 3 });
  }
  if (suits.size === 1 && !hasHonors) {
    entries.push({ name: 'chinitsu', han: openMeldCount > 0 ? 5 : 6 });
  }

  const doraIndices = ctx.doraTiles.map(doraFromIndicator);
  const doraCount = allTiles.reduce((count, tile) => {
    const index = tileToIndex(tile);
    return count + doraIndices.filter(doraIndex => doraIndex === index).length;
  }, 0);
  if (doraCount > 0) {
    entries.push({ name: 'dora', han: doraCount });
  }

  const redDoraCount = allTiles.filter(tile => tile.isRed).length;
  if (redDoraCount > 0) {
    entries.push({ name: 'red-dora', han: redDoraCount });
  }

  return entries;
}

function detectChiitoitsu(ctx: YakuContext): boolean {
  if (ctx.melds.length > 0 || ctx.hand.length !== 14) {
    return false;
  }
  const counts = buildCounts(ctx.hand);
  return counts.filter(count => count === 2).length === 7;
}

function evaluateChiitoitsuYaku(ctx: YakuContext): YakuEntry[] {
  const openMeldCount = getOpenMeldCount(ctx.melds);
  return [{ name: 'chiitoitsu', han: 2 }, ...evaluateUniversalYaku(ctx, openMeldCount)];
}

function evaluateStandardYaku(
  ctx: YakuContext,
  decomposition: Decomposition,
  openMeldCount: number
): YakuEntry[] {
  const entries = evaluateUniversalYaku(ctx, openMeldCount);
  const sequences = decomposition.mentsu.filter(mentsu => mentsu.type === 'sequence');
  const triplets = decomposition.mentsu.filter(mentsu => mentsu.type === 'triplet');
  const openSequences = ctx.melds
    .filter(meld => meld.type === 'chi')
    .map(meld => Math.min(...meld.tiles.map(tile => tileToIndex(tile))));

  if (
    openMeldCount === 0 &&
    decomposition.mentsu.every(mentsu => mentsu.type === 'sequence') &&
    !isYakuhaiIndex(decomposition.jantou, ctx.seatWind, ctx.roundWind)
  ) {
    entries.push({ name: 'pinfu', han: 1 });
  }

  if (openMeldCount === 0) {
    const sequenceCounts = new Map<number, number>();
    for (const sequence of sequences) {
      sequenceCounts.set(
        sequence.startIndex,
        (sequenceCounts.get(sequence.startIndex) ?? 0) + 1
      );
    }
    if ([...sequenceCounts.values()].some(count => count >= 2)) {
      entries.push({ name: 'iipeikou', han: 1 });
    }
  }

  const yakuhaiHan =
    triplets.filter(mentsu =>
      isYakuhaiIndex(mentsu.startIndex, ctx.seatWind, ctx.roundWind)
    ).length +
    ctx.melds.filter(
      meld =>
        (meld.type === 'pon' || meld.type === 'kan' || meld.type === 'closed-kan') &&
        isYakuhaiIndex(tileToIndex(meld.tiles[0]), ctx.seatWind, ctx.roundWind)
    ).length;
  if (yakuhaiHan > 0) {
    entries.push({ name: 'yakuhai', han: yakuhaiHan });
  }

  if (
    decomposition.mentsu.every(mentsu => mentsu.type === 'triplet') &&
    ctx.melds.every(
      meld => meld.type === 'pon' || meld.type === 'kan' || meld.type === 'closed-kan'
    )
  ) {
    entries.push({ name: 'toitoi', han: 2 });
  }

  const allSequenceStarts = [
    ...sequences.map(sequence => sequence.startIndex),
    ...openSequences,
  ];

  for (let suit = 0; suit < 3; suit += 1) {
    const base = suit * 9;
    if (
      allSequenceStarts.includes(base) &&
      allSequenceStarts.includes(base + 3) &&
      allSequenceStarts.includes(base + 6)
    ) {
      entries.push({ name: 'ittsu', han: openMeldCount > 0 ? 1 : 2 });
      break;
    }
  }

  for (let offset = 0; offset <= 6; offset += 1) {
    if (
      allSequenceStarts.includes(offset) &&
      allSequenceStarts.includes(9 + offset) &&
      allSequenceStarts.includes(18 + offset)
    ) {
      entries.push({ name: 'sanshoku-doujun', han: openMeldCount > 0 ? 1 : 2 });
      break;
    }
  }

  return entries;
}

function compareEntryLists(a: YakuEntry[], b: YakuEntry[]): number {
  const hanDiff = b.reduce((sum, entry) => sum + entry.han, 0) - a.reduce((sum, entry) => sum + entry.han, 0);
  if (hanDiff !== 0) {
    return hanDiff;
  }

  const aKey = aggregateYaku(a).map(entry => `${entry.name}:${entry.han}`).join('|');
  const bKey = aggregateYaku(b).map(entry => `${entry.name}:${entry.han}`).join('|');
  return aKey.localeCompare(bKey);
}

export function detectYaku(ctx: YakuContext): YakuDetectionResult {
  const shanten = calcShanten(ctx.hand, ctx.melds).shanten;
  if (shanten !== -1) {
    return createResult([], ['Hand is not complete.']);
  }

  if (detectChiitoitsu(ctx)) {
    const entries = evaluateChiitoitsuYaku(ctx);
    const warnings = hasNonDoraYaku(entries) ? [] : ['No yaku exists for this hand.'];
    return createResult(entries, warnings);
  }

  const openMeldCount = getOpenMeldCount(ctx.melds);
  const decompositions = findDecompositions(buildCounts(ctx.hand), openMeldCount);

  if (decompositions.length === 0) {
    const entries = evaluateUniversalYaku(ctx, openMeldCount);
    const warnings = hasNonDoraYaku(entries) ? [] : ['No yaku exists for this hand.'];
    return createResult(entries, warnings);
  }

  let bestEntries: YakuEntry[] | null = null;
  for (const decomposition of decompositions) {
    const entries = evaluateStandardYaku(ctx, decomposition, openMeldCount);
    if (bestEntries === null || compareEntryLists(bestEntries, entries) > 0) {
      bestEntries = entries;
    }
  }

  const warnings = bestEntries && hasNonDoraYaku(bestEntries)
    ? []
    : ['No yaku exists for this hand.'];
  return createResult(bestEntries ?? [], warnings);
}

export const calcYaku = detectYaku;

export function suggestPossibleYaku(
  ctx: YakuContext,
  options: PossibleYakuOptions = {}
): YakuEntry[] {
  const possible: YakuEntry[] = [];
  const allTiles = [...ctx.hand, ...ctx.melds.flatMap(meld => meld.tiles)];
  const openMeldCount = getOpenMeldCount(ctx.melds);
  const counts = buildCounts(ctx.hand);
  const openTanyaoEnabled = options.openTanyaoEnabled ?? true;

  if (ctx.isRiichi || openMeldCount === 0) {
    possible.push({ name: 'riichi', han: 1 });
  }

  if (openMeldCount === 0) {
    possible.push({ name: 'menzen-tsumo', han: 1 });
  }

  if (
    allTiles.length > 0 &&
    allTiles.every(tile => isSimple(tileToIndex(tile))) &&
    (openMeldCount === 0 || openTanyaoEnabled)
  ) {
    possible.push({ name: 'tanyao', han: 1 });
  }

  if (
    openMeldCount === 0 &&
    counts.every(count => count < 3)
  ) {
    possible.push({ name: 'pinfu', han: 1 });
  }

  if (openMeldCount === 0) {
    for (let suit = 0; suit < 3; suit += 1) {
      const base = suit * 9;
      for (let start = 0; start <= 6; start += 1) {
        if (
          counts[base + start] >= 2 &&
          counts[base + start + 1] >= 2 &&
          counts[base + start + 2] >= 2
        ) {
          possible.push({ name: 'iipeikou', han: 1 });
          suit = 3;
          break;
        }
      }
    }
  }

  for (let index = 27; index < 34; index += 1) {
    if (!isYakuhaiIndex(index, ctx.seatWind, ctx.roundWind)) {
      continue;
    }
    const hasMeld = ctx.melds.some(
      meld =>
        (meld.type === 'pon' || meld.type === 'kan' || meld.type === 'closed-kan') &&
        tileToIndex(meld.tiles[0]) === index
    );
    if (hasMeld || counts[index] >= 2) {
      possible.push({ name: 'yakuhai', han: 1 });
      break;
    }
  }

  if (
    ctx.melds.every(
      meld => meld.type === 'pon' || meld.type === 'kan' || meld.type === 'closed-kan'
    ) &&
    counts.filter(count => count >= 2).length >= 3
  ) {
    possible.push({ name: 'toitoi', han: 2 });
  }

  if (openMeldCount === 0 && counts.filter(count => count >= 2).length >= 4) {
    possible.push({ name: 'chiitoitsu', han: 2 });
  }

  const suits = new Set(allTiles.map(tile => getSuit(tileToIndex(tile))).filter(suit => suit >= 0));
  const hasHonors = allTiles.some(tile => isHonor(tileToIndex(tile)));
  if (suits.size === 1 && allTiles.length > 0) {
    possible.push({
      name: hasHonors ? 'honitsu' : 'chinitsu',
      han: hasHonors ? (openMeldCount > 0 ? 2 : 3) : openMeldCount > 0 ? 5 : 6,
    });
  }

  for (let suit = 0; suit < 3; suit += 1) {
    const base = suit * 9;
    const has123 = counts[base] > 0 && counts[base + 1] > 0 && counts[base + 2] > 0;
    const has456 = counts[base + 3] > 0 && counts[base + 4] > 0 && counts[base + 5] > 0;
    const has789 = counts[base + 6] > 0 && counts[base + 7] > 0 && counts[base + 8] > 0;
    if (has123 && has456 && has789) {
      possible.push({ name: 'ittsu', han: openMeldCount > 0 ? 1 : 2 });
      break;
    }
  }

  for (let start = 0; start <= 6; start += 1) {
    if (counts[start] > 0 && counts[9 + start] > 0 && counts[18 + start] > 0) {
      possible.push({ name: 'sanshoku-doujun', han: openMeldCount > 0 ? 1 : 2 });
      break;
    }
  }

  const doraLike = evaluateUniversalYaku(ctx, openMeldCount).filter(
    entry => entry.name === 'dora' || entry.name === 'red-dora'
  );
  possible.push(...doraLike);

  return aggregateYaku(possible);
}
