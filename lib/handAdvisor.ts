import {
  GameConfig,
  Meld,
  Tile,
  WindValue,
  DragonValue,
  OpponentDiscardEvent,
  OpponentPosition,
} from './types';
import { calcShanten } from './shanten';
import { suggestPossibleYaku, YakuContext, YakuName } from './yaku';

export interface HandAdvisorContext {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  doraTiles: Tile[];
  isRiichi: boolean;
  isTsumo: boolean;
  openTanyaoEnabled: boolean;
  lastOpponentDiscard?: OpponentDiscardEvent | null;
}

export interface DiscardAnalysis {
  tile: string;
  shanten: number;
  ukeire: number;
  possibleYaku: YakuName[];
  targetYaku: string;
  recommendation: string[];
}

export interface HandAnalysis {
  shanten: number;
  ukeire: number;
  possibleYaku: YakuName[];
  targetYaku: string;
  bestDiscard: string | null;
  alternatives: string[];
  recommendation: string[];
  warnings: string[];
  discardOptions: DiscardAnalysis[];
  callRecommendation: string[];
}

const SUIT_SUFFIX: Record<'man' | 'pin' | 'sou', string> = {
  man: 'm',
  pin: 'p',
  sou: 's',
};

const WIND_LABEL: Record<WindValue, string> = {
  east: 'E',
  south: 'S',
  west: 'W',
  north: 'N',
};

const DRAGON_LABEL: Record<DragonValue, string> = {
  red: 'R',
  green: 'G',
  white: 'Wh',
};

const ALL_TILE_LABELS = [
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
  '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
  'E', 'S', 'W', 'N', 'R', 'G', 'Wh',
] as const;

function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind') return WIND_LABEL[tile.value as WindValue];
  if (tile.suit === 'dragon') return DRAGON_LABEL[tile.value as DragonValue];
  return `${tile.isRed ? '0' : tile.value}${SUIT_SUFFIX[tile.suit]}`;
}

function baseTileLabel(tile: Tile): string {
  if (tile.suit === 'wind' || tile.suit === 'dragon') {
    return tileLabel(tile);
  }
  return `${tile.value}${SUIT_SUFFIX[tile.suit]}`;
}

function sameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

function createTileFromLabel(label: string, id: string): Tile {
  if (label === 'E') return { suit: 'wind', value: 'east', isRed: false, id };
  if (label === 'S') return { suit: 'wind', value: 'south', isRed: false, id };
  if (label === 'W') return { suit: 'wind', value: 'west', isRed: false, id };
  if (label === 'N') return { suit: 'wind', value: 'north', isRed: false, id };
  if (label === 'R') return { suit: 'dragon', value: 'red', isRed: false, id };
  if (label === 'G') return { suit: 'dragon', value: 'green', isRed: false, id };
  if (label === 'Wh') return { suit: 'dragon', value: 'white', isRed: false, id };

  const value = Number(label[0]);
  const suitCode = label[1];
  const suit = suitCode === 'm' ? 'man' : suitCode === 'p' ? 'pin' : 'sou';
  return { suit, value, isRed: false, id };
}

function toYakuContext(ctx: HandAdvisorContext, hand: Tile[]): YakuContext {
  return {
    hand,
    melds: ctx.melds,
    seatWind: ctx.seatWind,
    roundWind: ctx.roundWind,
    doraTiles: ctx.doraTiles,
    isRiichi: ctx.isRiichi,
    isTsumo: ctx.isTsumo,
  };
}

function remainingCopies(ctx: HandAdvisorContext, label: string): number {
  const visibleTiles = [...ctx.hand, ...ctx.melds.flatMap(meld => meld.tiles)];
  const visibleCount = visibleTiles.filter(tile => baseTileLabel(tile) === label).length;
  return Math.max(0, 4 - visibleCount);
}

function calculateUkeire(ctx: HandAdvisorContext, hand: Tile[]): number {
  const currentShanten = calcShanten(hand, ctx.melds).shanten;
  let total = 0;

  for (const label of ALL_TILE_LABELS) {
    const remaining = remainingCopies({ ...ctx, hand }, label);
    if (remaining === 0) {
      continue;
    }
    const drawnTile = createTileFromLabel(label, `ukeire-${label}`);
    const nextShanten = calcShanten([...hand, drawnTile], ctx.melds).shanten;
    if (nextShanten < currentShanten) {
      total += remaining;
    }
  }

  return total;
}

function getPossibleYaku(ctx: HandAdvisorContext, hand: Tile[]): YakuName[] {
  return suggestPossibleYaku(toYakuContext(ctx, hand), {
    openTanyaoEnabled: ctx.openTanyaoEnabled,
  }).map(entry => entry.name);
}

function getDoraHan(ctx: HandAdvisorContext, hand: Tile[]): number {
  return suggestPossibleYaku(toYakuContext(ctx, hand), {
    openTanyaoEnabled: ctx.openTanyaoEnabled,
  })
    .filter(entry => entry.name === 'dora' || entry.name === 'red-dora')
    .reduce((sum, entry) => sum + entry.han, 0);
}

function buildTargetYaku(possibleYaku: YakuName[], doraHan: number): string {
  const names = new Set(possibleYaku);

  if (names.has('riichi') && names.has('pinfu') && doraHan > 0) {
    return `Riichi + Pinfu + Dora ${Math.min(doraHan, 3)}`;
  }
  if (names.has('riichi') && names.has('pinfu')) {
    return 'Riichi + Pinfu';
  }
  if (names.has('riichi') && names.has('tanyao') && doraHan > 0) {
    return `Riichi + Tanyao + Dora ${Math.min(doraHan, 3)}`;
  }
  if (names.has('chiitoitsu')) {
    return 'Chiitoitsu';
  }
  if (names.has('honitsu')) {
    return 'Honitsu';
  }
  if (names.has('chinitsu')) {
    return 'Chinitsu';
  }
  if (names.has('tanyao')) {
    return 'Tanyao';
  }
  if (names.has('yakuhai')) {
    return 'Yakuhai';
  }
  return 'Build one yaku first';
}

function buildRecommendation(ctx: HandAdvisorContext, possibleYaku: YakuName[]): string[] {
  const names = new Set(possibleYaku);
  const closedValue = (['riichi', 'pinfu', 'iipeikou', 'chiitoitsu'] as YakuName[]).some(name =>
    names.has(name)
  );

  if (ctx.melds.length === 0 && closedValue) {
    return ['Keep hand closed.', 'Do not Pon.'];
  }

  if (ctx.melds.length === 0 && names.has('tanyao') && !ctx.openTanyaoEnabled) {
    return ['Keep hand closed.', 'Open tanyao is disabled.'];
  }

  if (ctx.melds.length === 0) {
    return ['Keep hand flexible.', 'Avoid opening without clear value.'];
  }

  return ['Hand is already open.', 'Push the fastest valid yaku line.'];
}

function positionAllowsChi(position: OpponentPosition): boolean {
  return position === 'left';
}

function buildChiOptions(tile: Tile): Tile[][] {
  if (tile.suit !== 'man' && tile.suit !== 'pin' && tile.suit !== 'sou') {
    return [];
  }

  const value = tile.value as number;
  const options: Tile[][] = [];
  const suit = tile.suit;

  const candidates = [
    [value - 2, value - 1],
    [value - 1, value + 1],
    [value + 1, value + 2],
  ];

  for (const [a, b] of candidates) {
    if (a < 1 || b > 9) {
      continue;
    }
    options.push([
      { suit, value: a, isRed: false, id: `chi-${a}${suit}` },
      { suit, value: b, isRed: false, id: `chi-${b}${suit}` },
    ]);
  }

  return options;
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

function removeTiles(hand: Tile[], needed: Tile[]): Tile[] {
  const remaining = [...hand];
  for (const need of needed) {
    const index = remaining.findIndex(tile => sameTile(tile, need));
    if (index !== -1) {
      remaining.splice(index, 1);
    }
  }
  return remaining;
}

function buildCallRecommendation(ctx: HandAdvisorContext): string[] {
  const discardEvent = ctx.lastOpponentDiscard;
  if (!discardEvent || ctx.isRiichi) {
    return [];
  }

  const passAnalysis = analyzeHand({ ...ctx, lastOpponentDiscard: null });
  const passHasYakuLine = passAnalysis.possibleYaku.length > 0;
  const lines: string[] = [];
  const calledTile = discardEvent.tile;

  const ponNeeded = [calledTile, calledTile];
  if (canRemoveTiles(ctx.hand, ponNeeded)) {
    const handAfterPon = removeTiles(ctx.hand, ponNeeded);
    const ponPossibleYaku = getPossibleYaku(
      {
        ...ctx,
        hand: handAfterPon,
        melds: [...ctx.melds, { type: 'pon', tiles: [calledTile, calledTile, calledTile] }],
      },
      handAfterPon
    );
    const ponShanten = calcShanten(handAfterPon, [
      ...ctx.melds,
      { type: 'pon', tiles: [calledTile, calledTile, calledTile] },
    ]).shanten;
    if (
      (!passHasYakuLine && ponPossibleYaku.length > 0) ||
      ponShanten < passAnalysis.shanten ||
      (ponShanten === passAnalysis.shanten &&
        ponPossibleYaku.length >= passAnalysis.possibleYaku.length &&
        ponPossibleYaku.length > 0)
    ) {
      lines.push(`Pon ${tileLabel(calledTile)} is viable.`);
    }
  }

  if (positionAllowsChi(discardEvent.position)) {
    const chiOptions = buildChiOptions(calledTile).filter(option => canRemoveTiles(ctx.hand, option));
    if (chiOptions.length > 0) {
      const bestChi = chiOptions.some(option => {
        const handAfterChi = removeTiles(ctx.hand, option);
        const chiMeld = { type: 'chi' as const, tiles: [...option, calledTile] };
        const chiPossibleYaku = getPossibleYaku(
          {
            ...ctx,
            hand: handAfterChi,
            melds: [...ctx.melds, chiMeld],
          },
          handAfterChi
        );
        const chiShanten = calcShanten(handAfterChi, [...ctx.melds, chiMeld]).shanten;
        return (
          (!passHasYakuLine && chiPossibleYaku.length > 0) ||
          chiShanten < passAnalysis.shanten ||
          (chiShanten === passAnalysis.shanten &&
            chiPossibleYaku.length >= passAnalysis.possibleYaku.length &&
            chiPossibleYaku.length > 0)
        );
      });

      if (bestChi) {
        lines.push(`Chi ${tileLabel(calledTile)} is viable.`);
      }
    }
  }

  if (lines.length === 0) {
    return ['Pass and draw.'];
  }

  return [...lines, 'Pass if the call breaks your best yaku line.'];
}

function compareDiscards(a: DiscardAnalysis, b: DiscardAnalysis): number {
  if (a.shanten !== b.shanten) {
    return a.shanten - b.shanten;
  }
  if (a.ukeire !== b.ukeire) {
    return b.ukeire - a.ukeire;
  }

  const aClosed = a.recommendation.includes('Keep hand closed.') ? 1 : 0;
  const bClosed = b.recommendation.includes('Keep hand closed.') ? 1 : 0;
  if (aClosed !== bClosed) {
    return bClosed - aClosed;
  }

  if (a.possibleYaku.length !== b.possibleYaku.length) {
    return b.possibleYaku.length - a.possibleYaku.length;
  }

  return a.tile.localeCompare(b.tile);
}

function analyzeDiscard(ctx: HandAdvisorContext, discardTile: Tile): DiscardAnalysis {
  const handAfterDiscard = ctx.hand.filter(tile => tile.id !== discardTile.id);
  const possibleYaku = getPossibleYaku({ ...ctx, hand: handAfterDiscard }, handAfterDiscard);
  const doraHan = getDoraHan({ ...ctx, hand: handAfterDiscard }, handAfterDiscard);

  return {
    tile: tileLabel(discardTile),
    shanten: calcShanten(handAfterDiscard, ctx.melds).shanten,
    ukeire: calculateUkeire({ ...ctx, hand: handAfterDiscard }, handAfterDiscard),
    possibleYaku,
    targetYaku: buildTargetYaku(possibleYaku, doraHan),
    recommendation: buildRecommendation(ctx, possibleYaku),
  };
}

function uniqueDiscardCandidates(hand: Tile[]): Tile[] {
  const seen = new Set<string>();
  const unique: Tile[] = [];

  for (const tile of hand) {
    const label = tileLabel(tile);
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    unique.push(tile);
  }

  return unique;
}

export function analyzeHand(ctx: HandAdvisorContext): HandAnalysis {
  const tileCountMod = ctx.hand.length % 3;
  const warnings: string[] = [];

  if (ctx.hand.length === 0) {
    return {
      shanten: 0,
      ukeire: 0,
      possibleYaku: [],
      targetYaku: 'Build one yaku first',
      bestDiscard: null,
      alternatives: [],
      recommendation: [],
      warnings: ['No hand to analyze.'],
      discardOptions: [],
      callRecommendation: [],
    };
  }

  if (tileCountMod === 1) {
    const possibleYaku = getPossibleYaku(ctx, ctx.hand);
    const doraHan = getDoraHan(ctx, ctx.hand);
    if (possibleYaku.length === 0) {
      warnings.push('No clear yaku line yet.');
    }

    return {
      shanten: calcShanten(ctx.hand, ctx.melds).shanten,
      ukeire: calculateUkeire(ctx, ctx.hand),
      possibleYaku,
      targetYaku: buildTargetYaku(possibleYaku, doraHan),
      bestDiscard: null,
      alternatives: [],
      recommendation: buildRecommendation(ctx, possibleYaku),
      warnings,
      discardOptions: [],
      callRecommendation: buildCallRecommendation(ctx),
    };
  }

  const discardOptions = uniqueDiscardCandidates(ctx.hand)
    .map(tile => analyzeDiscard(ctx, tile))
    .sort(compareDiscards);

  const best = discardOptions[0] ?? null;
  if (!best) {
    warnings.push('No discard recommendation available.');
  } else if (best.possibleYaku.length === 0) {
    warnings.push('No clear yaku line yet.');
  }

  return {
    shanten: best?.shanten ?? calcShanten(ctx.hand, ctx.melds).shanten,
    ukeire: best?.ukeire ?? 0,
    possibleYaku: best?.possibleYaku ?? [],
    targetYaku: best?.targetYaku ?? 'Build one yaku first',
    bestDiscard: best?.tile ?? null,
    alternatives: discardOptions.slice(1, 3).map(option => option.tile),
    recommendation: best?.recommendation ?? [],
    warnings,
    discardOptions,
    callRecommendation: buildCallRecommendation(ctx),
  };
}

export function analyzeGameHand(
  hand: Tile[],
  melds: Meld[],
  seatWind: WindValue,
  config: GameConfig,
  isRiichi: boolean,
  isTsumo: boolean,
  lastOpponentDiscard: OpponentDiscardEvent | null = null
): HandAnalysis {
  return analyzeHand({
    hand,
    melds,
    seatWind,
    roundWind: config.roundWind,
    doraTiles: config.doraTiles,
    isRiichi,
    isTsumo,
    openTanyaoEnabled: config.openTanyaoEnabled,
    lastOpponentDiscard,
  });
}
