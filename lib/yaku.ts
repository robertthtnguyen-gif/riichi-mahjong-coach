import { DragonValue, Meld, Tile, WindValue } from './types';

export type YakuName =
  | 'riichi'
  | 'double-riichi'
  | 'ippatsu'
  | 'menzen-tsumo'
  | 'tanyao'
  | 'pinfu'
  | 'iipeikou'
  | 'yakuhai'
  | 'haitei'
  | 'houtei'
  | 'rinshan-kaihou'
  | 'chankan'
  | 'chiitoitsu'
  | 'ittsu'
  | 'sanshoku-doujun'
  | 'chanta'
  | 'sanshoku-doukou'
  | 'sanankou'
  | 'sankantsu'
  | 'toitoi'
  | 'honroutou'
  | 'shousangen'
  | 'ryanpeikou'
  | 'honitsu'
  | 'junchan'
  | 'chinitsu'
  | 'kokushi-musou'
  | 'chuuren-poutou'
  | 'suuankou'
  | 'suukantsu'
  | 'ryuuiisou'
  | 'chinroutou'
  | 'tsuuiisou'
  | 'daisangen'
  | 'shousuushii'
  | 'daisuushii'
  | 'dora'
  | 'red-dora'
  | 'ura-dora'
  | 'kan-dora'
  | 'kan-ura-dora';

export interface YakuEntry {
  name: YakuName;
  han: number;
  yakuman?: boolean;
}

export interface YakuDetectionResult {
  yaku: YakuEntry[];
  possible: YakuEntry[];
  han: number;
  warnings: string[];
  isYakuman: boolean;
}

export type WinMethod = 'tsumo' | 'ron';

export interface YakuContext {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  winningTile?: Tile | null;
  winMethod?: WinMethod;
  isRiichi?: boolean;
  riichi?: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  isTsumo?: boolean;
  isHaitei?: boolean;
  isHoutei?: boolean;
  isRinshan?: boolean;
  isChankan?: boolean;
  doraTiles?: Tile[];
  doraIndicators?: Tile[];
  uraDoraIndicators?: Tile[];
  kanDoraIndicators?: Tile[];
  kanUraDoraIndicators?: Tile[];
  openTanyaoEnabled?: boolean;
}

export interface PossibleYakuOptions {
  openTanyaoEnabled?: boolean;
}

type SuitIndex = 0 | 1 | 2;

interface NormalizedContext {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  winningTile: Tile | null;
  winMethod: WinMethod;
  riichi: boolean;
  doubleRiichi: boolean;
  ippatsu: boolean;
  haitei: boolean;
  houtei: boolean;
  rinshan: boolean;
  chankan: boolean;
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
  kanDoraIndicators: Tile[];
  kanUraDoraIndicators: Tile[];
  openTanyaoEnabled: boolean;
}

interface Decomposition {
  sequences: number[];
  triplets: number[];
  pair: number;
}

interface Block {
  kind: 'sequence' | 'triplet' | 'quad';
  startIndex: number;
  open: boolean;
  concealed: boolean;
}

interface StandardCandidate {
  decomposition: Decomposition;
  blocks: Block[];
}

const WIND_IDX: Record<WindValue, number> = { east: 0, south: 1, west: 2, north: 3 };
const DRAGON_IDX: Record<DragonValue, number> = { red: 0, green: 1, white: 2 };
const TERMINAL_HONOR_INDICES = new Set([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);
const GREEN_INDICES = new Set([19, 20, 21, 23, 25, 32]); // 2s 3s 4s 6s 8s G

const YAKU_ORDER: YakuName[] = [
  'double-riichi',
  'riichi',
  'ippatsu',
  'menzen-tsumo',
  'tanyao',
  'pinfu',
  'iipeikou',
  'yakuhai',
  'haitei',
  'houtei',
  'rinshan-kaihou',
  'chankan',
  'chiitoitsu',
  'ittsu',
  'sanshoku-doujun',
  'chanta',
  'sanshoku-doukou',
  'sanankou',
  'sankantsu',
  'toitoi',
  'honroutou',
  'shousangen',
  'ryanpeikou',
  'honitsu',
  'junchan',
  'chinitsu',
  'kokushi-musou',
  'chuuren-poutou',
  'suuankou',
  'suukantsu',
  'ryuuiisou',
  'chinroutou',
  'tsuuiisou',
  'daisangen',
  'shousuushii',
  'daisuushii',
  'dora',
  'red-dora',
  'ura-dora',
  'kan-dora',
  'kan-ura-dora',
];

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

function isTerminal(index: number): boolean {
  return !isHonor(index) && (index % 9 === 0 || index % 9 === 8);
}

function isTerminalOrHonor(index: number): boolean {
  return isHonor(index) || isTerminal(index);
}

function isSimple(index: number): boolean {
  return !isTerminalOrHonor(index);
}

function getSuitIndex(index: number): SuitIndex | null {
  if (index >= 27) {
    return null;
  }
  return Math.floor(index / 9) as SuitIndex;
}

function getOpenMeldCount(melds: Meld[]): number {
  return melds.filter(meld => meld.type !== 'closed-kan').length;
}

function isClosedHand(melds: Meld[]): boolean {
  return getOpenMeldCount(melds) === 0;
}

function aggregateYaku(entries: YakuEntry[]): YakuEntry[] {
  const totals = new Map<YakuName, { han: number; yakuman: boolean }>();

  for (const entry of entries) {
    const current = totals.get(entry.name);
    if (current) {
      current.han += entry.han;
      current.yakuman = current.yakuman || !!entry.yakuman;
    } else {
      totals.set(entry.name, { han: entry.han, yakuman: !!entry.yakuman });
    }
  }

  return YAKU_ORDER
    .filter(name => totals.has(name))
    .map(name => ({
      name,
      han: totals.get(name)!.han,
      yakuman: totals.get(name)!.yakuman || undefined,
    }));
}

function hasRealYaku(entries: YakuEntry[]): boolean {
  return entries.some(
    entry =>
      entry.name !== 'dora' &&
      entry.name !== 'red-dora' &&
      entry.name !== 'ura-dora' &&
      entry.name !== 'kan-dora' &&
      entry.name !== 'kan-ura-dora'
  );
}

function normalizeContext(ctx: YakuContext): NormalizedContext {
  return {
    hand: ctx.hand,
    melds: ctx.melds,
    seatWind: ctx.seatWind,
    roundWind: ctx.roundWind,
    winningTile: ctx.winningTile ?? null,
    winMethod: ctx.winMethod ?? (ctx.isTsumo ? 'tsumo' : 'ron'),
    riichi: ctx.doubleRiichi || ctx.riichi || ctx.isRiichi || false,
    doubleRiichi: ctx.doubleRiichi ?? false,
    ippatsu: ctx.ippatsu ?? false,
    haitei: ctx.isHaitei ?? false,
    houtei: ctx.isHoutei ?? false,
    rinshan: ctx.isRinshan ?? false,
    chankan: ctx.isChankan ?? false,
    doraIndicators: ctx.doraIndicators ?? ctx.doraTiles ?? [],
    uraDoraIndicators: ctx.uraDoraIndicators ?? [],
    kanDoraIndicators: ctx.kanDoraIndicators ?? [],
    kanUraDoraIndicators: ctx.kanUraDoraIndicators ?? [],
    openTanyaoEnabled: ctx.openTanyaoEnabled ?? true,
  };
}

function doraFromIndicator(indicator: Tile): number {
  const index = tileToIndex(indicator);
  if (index >= 31) return index === 33 ? 31 : index + 1;
  if (index >= 27) return index === 30 ? 27 : index + 1;
  const base = Math.floor(index / 9) * 9;
  return base + (index % 9 === 8 ? 0 : index % 9 + 1);
}

function yakuhaiHanForIndex(index: number, seatWind: WindValue, roundWind: WindValue): number {
  if (index >= 31) {
    return 1;
  }
  if (index < 27) {
    return 0;
  }

  const wind = index - 27;
  let han = 0;
  if (wind === WIND_IDX[seatWind]) {
    han += 1;
  }
  if (wind === WIND_IDX[roundWind]) {
    han += 1;
  }
  return han;
}

function createBlocksForMelds(melds: Meld[]): Block[] {
  return melds.map(meld => {
    const startIndex = Math.min(...meld.tiles.map(tileToIndex));
    if (meld.type === 'chi') {
      return { kind: 'sequence', startIndex, open: true, concealed: false };
    }
    if (meld.type === 'closed-kan') {
      return { kind: 'quad', startIndex, open: false, concealed: true };
    }
    return {
      kind: meld.type === 'kan' ? 'quad' : 'triplet',
      startIndex,
      open: true,
      concealed: false,
    };
  });
}

function collectDecompositions(
  counts: number[],
  neededSets: number,
  sequences: number[],
  triplets: number[],
  pair: number,
  results: Decomposition[]
): void {
  if (neededSets === 0) {
    if (counts.every(count => count === 0)) {
      results.push({
        sequences: [...sequences],
        triplets: [...triplets],
        pair,
      });
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
    triplets.push(index);
    collectDecompositions(counts, neededSets - 1, sequences, triplets, pair, results);
    triplets.pop();
    counts[index] += 3;
  }

  if (!isHonor(index) && index % 9 <= 6 && counts[index + 1] > 0 && counts[index + 2] > 0) {
    counts[index] -= 1;
    counts[index + 1] -= 1;
    counts[index + 2] -= 1;
    sequences.push(index);
    collectDecompositions(counts, neededSets - 1, sequences, triplets, pair, results);
    sequences.pop();
    counts[index] += 1;
    counts[index + 1] += 1;
    counts[index + 2] += 1;
  }
}

function findStandardCandidates(ctx: NormalizedContext): StandardCandidate[] {
  const counts = buildCounts(ctx.hand);
  const neededSets = 4 - ctx.melds.length;
  const meldBlocks = createBlocksForMelds(ctx.melds);
  const results: StandardCandidate[] = [];

  for (let pair = 0; pair < 34; pair += 1) {
    if (counts[pair] < 2) {
      continue;
    }
    counts[pair] -= 2;
    const decompositions: Decomposition[] = [];
    collectDecompositions(counts, neededSets, [], [], pair, decompositions);
    counts[pair] += 2;

    for (const decomposition of decompositions) {
      results.push({
        decomposition,
        blocks: [
          ...decomposition.sequences.map(startIndex => ({
            kind: 'sequence' as const,
            startIndex,
            open: false,
            concealed: true,
          })),
          ...decomposition.triplets.map(startIndex => ({
            kind: 'triplet' as const,
            startIndex,
            open: false,
            concealed: true,
          })),
          ...meldBlocks,
        ],
      });
    }
  }

  return results;
}

function isCompleteHand(ctx: NormalizedContext): boolean {
  const totalTiles = ctx.hand.length + ctx.melds.length * 3;
  if (totalTiles !== 14) {
    return false;
  }

  if (detectKokushi(ctx) || detectChiitoitsu(ctx) || detectChuurenPoutou(ctx)) {
    return true;
  }

  return findStandardCandidates(ctx).length > 0;
}

function detectChiitoitsu(ctx: NormalizedContext): boolean {
  if (!isClosedHand(ctx.melds) || ctx.hand.length !== 14) {
    return false;
  }
  return buildCounts(ctx.hand).filter(count => count === 2).length === 7;
}

function detectKokushi(ctx: NormalizedContext): boolean {
  if (!isClosedHand(ctx.melds) || ctx.hand.length !== 14) {
    return false;
  }
  const counts = buildCounts(ctx.hand);
  let unique = 0;
  let pair = false;
  for (const index of TERMINAL_HONOR_INDICES) {
    if (counts[index] > 0) {
      unique += 1;
    }
    if (counts[index] >= 2) {
      pair = true;
    }
  }
  return unique === 13 && pair;
}

function detectChuurenPoutou(ctx: NormalizedContext): boolean {
  if (!isClosedHand(ctx.melds) || ctx.hand.length !== 14) {
    return false;
  }
  const counts = buildCounts(ctx.hand);
  const suits = new Set<number>();
  for (let index = 0; index < 27; index += 1) {
    if (counts[index] > 0) {
      suits.add(Math.floor(index / 9));
    }
  }
  if (suits.size !== 1 || counts.slice(27).some(count => count > 0)) {
    return false;
  }

  const suit = [...suits][0];
  const base = suit * 9;
  const suitCounts = counts.slice(base, base + 9);
  const required = [3, 1, 1, 1, 1, 1, 1, 1, 3];

  let extra = 0;
  for (let i = 0; i < 9; i += 1) {
    if (suitCounts[i] < required[i]) {
      return false;
    }
    extra += suitCounts[i] - required[i];
  }

  return extra === 1;
}

function tileMatchesSequence(tileIndex: number, startIndex: number): boolean {
  return tileIndex === startIndex || tileIndex === startIndex + 1 || tileIndex === startIndex + 2;
}

function isRyanmenWait(pairIndex: number, sequences: number[], winningTileIndex: number): boolean {
  if (pairIndex === winningTileIndex) {
    return false;
  }

  for (const startIndex of sequences) {
    if (!tileMatchesSequence(winningTileIndex, startIndex)) {
      continue;
    }

    const offset = winningTileIndex - startIndex;
    const position = startIndex % 9;
    if (offset === 0 && position > 0) {
      return true;
    }
    if (offset === 2 && position < 6) {
      return true;
    }
  }

  return false;
}

function countConcealedTriplets(ctx: NormalizedContext, candidate: StandardCandidate): number {
  const winningTileIndex = ctx.winningTile ? tileToIndex(ctx.winningTile) : null;
  let concealed = 0;

  for (const block of candidate.blocks) {
    if (block.kind !== 'triplet' && block.kind !== 'quad') {
      continue;
    }
    if (!block.concealed) {
      continue;
    }
    if (ctx.winMethod === 'ron' && winningTileIndex === block.startIndex) {
      continue;
    }
    concealed += 1;
  }

  return concealed;
}

function allTiles(ctx: NormalizedContext): Tile[] {
  return [...ctx.hand, ...ctx.melds.flatMap(meld => meld.tiles)];
}

function detectBonusYaku(ctx: NormalizedContext): YakuEntry[] {
  const tiles = allTiles(ctx);
  const entries: YakuEntry[] = [];

  const countFromIndicators = (indicators: Tile[]) => {
    const doraIndices = indicators.map(doraFromIndicator);
    let count = 0;
    for (const tile of tiles) {
      const tileIndex = tileToIndex(tile);
      for (const doraIndex of doraIndices) {
        if (tileIndex === doraIndex) {
          count += 1;
        }
      }
    }
    return count;
  };

  const doraHan = countFromIndicators(ctx.doraIndicators);
  if (doraHan > 0) {
    entries.push({ name: 'dora', han: doraHan });
  }

  const kanDoraHan = countFromIndicators(ctx.kanDoraIndicators);
  if (kanDoraHan > 0) {
    entries.push({ name: 'kan-dora', han: kanDoraHan });
  }

  if (ctx.riichi || ctx.doubleRiichi) {
    const uraDoraHan = countFromIndicators(ctx.uraDoraIndicators);
    if (uraDoraHan > 0) {
      entries.push({ name: 'ura-dora', han: uraDoraHan });
    }

    const kanUraDoraHan = countFromIndicators(ctx.kanUraDoraIndicators);
    if (kanUraDoraHan > 0) {
      entries.push({ name: 'kan-ura-dora', han: kanUraDoraHan });
    }
  }

  const redDoraHan = tiles.filter(tile => tile.isRed).length;
  if (redDoraHan > 0) {
    entries.push({ name: 'red-dora', han: redDoraHan });
  }

  return entries;
}

function evaluateCommonOneHanYaku(ctx: NormalizedContext, entries: YakuEntry[]): void {
  const closed = isClosedHand(ctx.melds);

  if (ctx.doubleRiichi && closed) {
    entries.push({ name: 'double-riichi', han: 2 });
  } else if (ctx.riichi && closed) {
    entries.push({ name: 'riichi', han: 1 });
  }

  if ((ctx.riichi || ctx.doubleRiichi) && ctx.ippatsu && closed) {
    entries.push({ name: 'ippatsu', han: 1 });
  }

  if (ctx.winMethod === 'tsumo' && closed) {
    entries.push({ name: 'menzen-tsumo', han: 1 });
  }

  if (ctx.haitei) {
    entries.push({ name: 'haitei', han: 1 });
  }
  if (ctx.houtei) {
    entries.push({ name: 'houtei', han: 1 });
  }
  if (ctx.rinshan) {
    entries.push({ name: 'rinshan-kaihou', han: 1 });
  }
  if (ctx.chankan) {
    entries.push({ name: 'chankan', han: 1 });
  }
}

function evaluateStandardCandidate(ctx: NormalizedContext, candidate: StandardCandidate): YakuEntry[] {
  const entries: YakuEntry[] = [];
  const closed = isClosedHand(ctx.melds);
  const winningTileIndex = ctx.winningTile ? tileToIndex(ctx.winningTile) : null;
  const pair = candidate.decomposition.pair;
  const sequences = candidate.blocks.filter(block => block.kind === 'sequence').map(block => block.startIndex);
  const tripletLike = candidate.blocks.filter(
    block => block.kind === 'triplet' || block.kind === 'quad'
  );

  evaluateCommonOneHanYaku(ctx, entries);

  const everyTileSimple = allTiles(ctx).every(tile => isSimple(tileToIndex(tile)));
  if (everyTileSimple) {
    entries.push({ name: 'tanyao', han: 1 });
  }

  const pairYakuhaiHan = yakuhaiHanForIndex(pair, ctx.seatWind, ctx.roundWind);
  const allSequences = candidate.blocks.every(block => block.kind === 'sequence');
  const pinfuWaitOk =
    winningTileIndex !== null &&
    isRyanmenWait(pair, candidate.decomposition.sequences, winningTileIndex);
  if (closed && allSequences && pairYakuhaiHan === 0 && pinfuWaitOk) {
    entries.push({ name: 'pinfu', han: 1 });
  }

  const sequenceCounts = new Map<number, number>();
  for (const startIndex of sequences) {
    sequenceCounts.set(startIndex, (sequenceCounts.get(startIndex) ?? 0) + 1);
  }
  const duplicateSequencePairs = [...sequenceCounts.values()].reduce(
    (sum, count) => sum + Math.floor(count / 2),
    0
  );
  if (closed && duplicateSequencePairs >= 2) {
    entries.push({ name: 'ryanpeikou', han: 3 });
  } else if (closed && duplicateSequencePairs >= 1) {
    entries.push({ name: 'iipeikou', han: 1 });
  }

  const yakuhaiHan = tripletLike.reduce(
    (sum, block) => sum + yakuhaiHanForIndex(block.startIndex, ctx.seatWind, ctx.roundWind),
    0
  );
  if (yakuhaiHan > 0) {
    entries.push({ name: 'yakuhai', han: yakuhaiHan });
  }

  const sameSuitSequenceStarts = new Set<number>(sequences);
  for (let suit = 0; suit < 3; suit += 1) {
    const base = suit * 9;
    if (
      sameSuitSequenceStarts.has(base) &&
      sameSuitSequenceStarts.has(base + 3) &&
      sameSuitSequenceStarts.has(base + 6)
    ) {
      entries.push({ name: 'ittsu', han: closed ? 2 : 1 });
      break;
    }
  }

  for (let start = 0; start <= 6; start += 1) {
    if (
      sameSuitSequenceStarts.has(start) &&
      sameSuitSequenceStarts.has(9 + start) &&
      sameSuitSequenceStarts.has(18 + start)
    ) {
      entries.push({ name: 'sanshoku-doujun', han: closed ? 2 : 1 });
      break;
    }
  }

  const allBlocksWithPair = [...candidate.blocks, { kind: 'pair' as const, startIndex: pair }];
  const everyGroupHasTerminalOrHonor = allBlocksWithPair.every(block => {
    if (block.kind === 'pair' || block.kind === 'triplet' || block.kind === 'quad') {
      return isTerminalOrHonor(block.startIndex);
    }
    return isTerminal(block.startIndex) || isTerminal(block.startIndex + 2);
  });
  const everyGroupHasTerminalNoHonors = allBlocksWithPair.every(block => {
    if (block.kind === 'pair' || block.kind === 'triplet' || block.kind === 'quad') {
      return isTerminal(block.startIndex);
    }
    return isTerminal(block.startIndex) || isTerminal(block.startIndex + 2);
  });
  const sequenceCount = candidate.blocks.filter(block => block.kind === 'sequence').length;
  const hasHonors = allTiles(ctx).some(tile => isHonor(tileToIndex(tile)));

  if (everyGroupHasTerminalOrHonor && sequenceCount > 0) {
    entries.push({ name: 'chanta', han: closed ? 2 : 1 });
  }

  if (everyGroupHasTerminalNoHonors && sequenceCount > 0 && !hasHonors) {
    entries.push({ name: 'junchan', han: closed ? 3 : 2 });
  }

  const tripletNumberSets = new Map<number, Set<SuitIndex>>();
  for (const block of tripletLike) {
    const suit = getSuitIndex(block.startIndex);
    if (suit === null) {
      continue;
    }
    const number = (block.startIndex % 9) + 1;
    if (!tripletNumberSets.has(number)) {
      tripletNumberSets.set(number, new Set<SuitIndex>());
    }
    tripletNumberSets.get(number)!.add(suit);
  }
  if ([...tripletNumberSets.values()].some(set => set.size === 3)) {
    entries.push({ name: 'sanshoku-doukou', han: 2 });
  }

  const concealedTriplets = countConcealedTriplets(ctx, candidate);
  if (concealedTriplets >= 3) {
    entries.push({ name: 'sanankou', han: 2 });
  }

  const quadCount = candidate.blocks.filter(block => block.kind === 'quad').length;
  if (quadCount >= 3) {
    entries.push({ name: 'sankantsu', han: 2 });
  }

  if (tripletLike.length === 4) {
    entries.push({ name: 'toitoi', han: 2 });
  }

  const allTerminalOrHonor = allTiles(ctx).every(tile => isTerminalOrHonor(tileToIndex(tile)));
  if (allTerminalOrHonor) {
    entries.push({ name: 'honroutou', han: 2 });
  }

  const dragonTriplets = tripletLike.filter(block => block.startIndex >= 31).length;
  const dragonPair = pair >= 31;
  if (dragonTriplets >= 2 && dragonPair) {
    entries.push({ name: 'shousangen', han: 2 });
  }

  const suits = new Set(
    allTiles(ctx)
      .map(tile => getSuitIndex(tileToIndex(tile)))
      .filter((suit): suit is SuitIndex => suit !== null)
  );
  if (suits.size === 1) {
    if (hasHonors) {
      entries.push({ name: 'honitsu', han: closed ? 3 : 2 });
    } else {
      entries.push({ name: 'chinitsu', han: closed ? 6 : 5 });
    }
  }

  return aggregateYaku(entries).filter(entry => {
    if (entry.name === 'chanta' && entries.some(item => item.name === 'junchan')) {
      return false;
    }
    if (entry.name === 'iipeikou' && entries.some(item => item.name === 'ryanpeikou')) {
      return false;
    }
    if (entry.name === 'honitsu' && entries.some(item => item.name === 'chinitsu')) {
      return false;
    }
    return true;
  });
}

function compareEntrySets(a: YakuEntry[], b: YakuEntry[]): number {
  const yakumanDiff =
    b.filter(entry => entry.yakuman).length - a.filter(entry => entry.yakuman).length;
  if (yakumanDiff !== 0) {
    return yakumanDiff;
  }

  const hanDiff =
    b.reduce((sum, entry) => sum + entry.han, 0) - a.reduce((sum, entry) => sum + entry.han, 0);
  if (hanDiff !== 0) {
    return hanDiff;
  }

  const aKey = aggregateYaku(a).map(entry => `${entry.name}:${entry.han}`).join('|');
  const bKey = aggregateYaku(b).map(entry => `${entry.name}:${entry.han}`).join('|');
  return aKey.localeCompare(bKey);
}

function detectYakuman(ctx: NormalizedContext, candidates: StandardCandidate[]): YakuEntry[] {
  const yakuman: YakuEntry[] = [];
  const allIndices = allTiles(ctx).map(tileToIndex);
  const closed = isClosedHand(ctx.melds);

  if (detectKokushi(ctx)) {
    yakuman.push({ name: 'kokushi-musou', han: 13, yakuman: true });
  }
  if (detectChuurenPoutou(ctx)) {
    yakuman.push({ name: 'chuuren-poutou', han: 13, yakuman: true });
  }

  if (allIndices.every(index => GREEN_INDICES.has(index))) {
    yakuman.push({ name: 'ryuuiisou', han: 13, yakuman: true });
  }
  if (allIndices.every(index => isTerminal(index))) {
    yakuman.push({ name: 'chinroutou', han: 13, yakuman: true });
  }
  if (allIndices.every(index => isHonor(index))) {
    yakuman.push({ name: 'tsuuiisou', han: 13, yakuman: true });
  }

  const standardYakuman: YakuEntry[] = [];
  for (const candidate of candidates) {
    const entries: YakuEntry[] = [];
    const tripletLike = candidate.blocks.filter(
      block => block.kind === 'triplet' || block.kind === 'quad'
    );
    const winningTileIndex = ctx.winningTile ? tileToIndex(ctx.winningTile) : null;

    const dragonTriplets = tripletLike.filter(block => block.startIndex >= 31).length;
    if (dragonTriplets === 3) {
      entries.push({ name: 'daisangen', han: 13, yakuman: true });
    }

    const windTriplets = tripletLike.filter(
      block => block.startIndex >= 27 && block.startIndex <= 30
    ).length;
    const windPair = candidate.decomposition.pair >= 27 && candidate.decomposition.pair <= 30;
    if (windTriplets === 4) {
      entries.push({ name: 'daisuushii', han: 13, yakuman: true });
    } else if (windTriplets === 3 && windPair) {
      entries.push({ name: 'shousuushii', han: 13, yakuman: true });
    }

    const concealedTriplets = countConcealedTriplets(ctx, candidate);
    if (
      concealedTriplets === 4 &&
      closed &&
      winningTileIndex !== null &&
      (ctx.winMethod === 'tsumo' || candidate.decomposition.pair === winningTileIndex)
    ) {
      entries.push({ name: 'suuankou', han: 13, yakuman: true });
    }

    const quadCount = candidate.blocks.filter(block => block.kind === 'quad').length;
    if (quadCount === 4) {
      entries.push({ name: 'suukantsu', han: 13, yakuman: true });
    }

    if (compareEntrySets(standardYakuman, entries) > 0 || standardYakuman.length === 0) {
      standardYakuman.splice(0, standardYakuman.length, ...entries);
    }
  }

  return aggregateYaku([...yakuman, ...standardYakuman]);
}

function detectStandardYaku(ctx: NormalizedContext, candidates: StandardCandidate[]): YakuEntry[] {
  let best: YakuEntry[] = [];

  for (const candidate of candidates) {
    const entries = evaluateStandardCandidate(ctx, candidate);
    if (best.length === 0 || compareEntrySets(best, entries) > 0) {
      best = entries;
    }
  }

  return best;
}

function detectChiitoitsuYaku(ctx: NormalizedContext): YakuEntry[] {
  const entries: YakuEntry[] = [{ name: 'chiitoitsu', han: 2 }];
  evaluateCommonOneHanYaku(ctx, entries);

  const counts = buildCounts(ctx.hand);
  const terminalsOrHonorsOnly = allTiles(ctx).every(tile => isTerminalOrHonor(tileToIndex(tile)));
  if (terminalsOrHonorsOnly) {
    entries.push({ name: 'honroutou', han: 2 });
  }

  const dragonPairs = [31, 32, 33].filter(index => counts[index] >= 2).length;
  if (dragonPairs === 3) {
    entries.push({ name: 'shousangen', han: 2 });
  }

  const suits = new Set(
    allTiles(ctx)
      .map(tile => getSuitIndex(tileToIndex(tile)))
      .filter((suit): suit is SuitIndex => suit !== null)
  );
  const hasHonors = allTiles(ctx).some(tile => isHonor(tileToIndex(tile)));
  if (suits.size === 1) {
    if (hasHonors) {
      entries.push({ name: 'honitsu', han: 3 });
    } else {
      entries.push({ name: 'chinitsu', han: 6 });
    }
  }

  return aggregateYaku(entries);
}

function buildWarnings(entries: YakuEntry[], complete: boolean): string[] {
  if (!complete) {
    return [];
  }
  if (!hasRealYaku(entries)) {
    return ['No yaku exists for this hand.'];
  }
  return [];
}

export function suggestPossibleYaku(
  rawCtx: YakuContext,
  options: PossibleYakuOptions = {}
): YakuEntry[] {
  const ctx = normalizeContext({
    ...rawCtx,
    openTanyaoEnabled: options.openTanyaoEnabled ?? rawCtx.openTanyaoEnabled,
  });
  const possible: YakuEntry[] = [];
  const counts = buildCounts(ctx.hand);
  const closed = isClosedHand(ctx.melds);
  const tiles = allTiles(ctx);

  if (closed) {
    possible.push({ name: ctx.doubleRiichi ? 'double-riichi' : 'riichi', han: ctx.doubleRiichi ? 2 : 1 });
    possible.push({ name: 'menzen-tsumo', han: 1 });
  }

  if (
    tiles.length > 0 &&
    tiles.every(tile => isSimple(tileToIndex(tile))) &&
    (closed || ctx.openTanyaoEnabled)
  ) {
    possible.push({ name: 'tanyao', han: 1 });
  }

  if (closed && counts.filter(count => count >= 2).length >= 4) {
    possible.push({ name: 'chiitoitsu', han: 2 });
  }

  if (
    closed &&
    counts.every(count => count < 3)
  ) {
    possible.push({ name: 'pinfu', han: 1 });
  }

  if (closed) {
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

  const allVisibleCounts = buildCounts(tiles);
  for (let index = 27; index < 34; index += 1) {
    if (yakuhaiHanForIndex(index, ctx.seatWind, ctx.roundWind) === 0) {
      continue;
    }
    if (allVisibleCounts[index] >= 2) {
      possible.push({ name: 'yakuhai', han: 1 });
      break;
    }
  }

  const suits = new Set(
    tiles
      .map(tile => getSuitIndex(tileToIndex(tile)))
      .filter((suit): suit is SuitIndex => suit !== null)
  );
  const hasHonors = tiles.some(tile => isHonor(tileToIndex(tile)));
  if (suits.size === 1 && tiles.length > 0) {
    if (hasHonors) {
      possible.push({ name: 'honitsu', han: closed ? 3 : 2 });
    } else {
      possible.push({ name: 'chinitsu', han: closed ? 6 : 5 });
    }
  }

  const bonus = detectBonusYaku(ctx);
  return aggregateYaku([...possible, ...bonus]);
}

export function detectYaku(rawCtx: YakuContext): YakuDetectionResult {
  const ctx = normalizeContext(rawCtx);
  const possible = suggestPossibleYaku(ctx, { openTanyaoEnabled: ctx.openTanyaoEnabled });
  const complete = isCompleteHand(ctx);

  if (!complete) {
    return {
      yaku: [],
      possible,
      han: 0,
      warnings: [],
      isYakuman: false,
    };
  }

  const candidates = findStandardCandidates(ctx);
  const yakuman = detectYakuman(ctx, candidates);
  if (yakuman.length > 0) {
    const entries = aggregateYaku(yakuman);
    return {
      yaku: entries,
      possible: [],
      han: entries.reduce((sum, entry) => sum + entry.han, 0),
      warnings: [],
      isYakuman: true,
    };
  }

  let baseYaku: YakuEntry[] = [];
  const chiitoitsuYaku = detectChiitoitsu(ctx) ? detectChiitoitsuYaku(ctx) : [];
  const standardYaku = candidates.length > 0 ? detectStandardYaku(ctx, candidates) : [];

  if (chiitoitsuYaku.length > 0 && standardYaku.length > 0) {
    baseYaku = compareEntrySets(chiitoitsuYaku, standardYaku) > 0 ? standardYaku : chiitoitsuYaku;
  } else if (chiitoitsuYaku.length > 0) {
    baseYaku = chiitoitsuYaku;
  } else {
    baseYaku = standardYaku;
  }

  const entries = aggregateYaku([...baseYaku, ...detectBonusYaku(ctx)]);
  return {
    yaku: entries,
    possible: [],
    han: entries.reduce((sum, entry) => sum + entry.han, 0),
    warnings: buildWarnings(entries, true),
    isYakuman: false,
  };
}

export const calcYaku = detectYaku;
