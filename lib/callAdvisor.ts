import { Meld, OpponentDiscardEvent, Tile, WindValue } from './types';
import { calcShanten } from './shanten';
import { detectYaku, suggestPossibleYaku, YakuContext } from './yaku';

export interface CallRecommendation {
  action: 'CALL' | 'PASS' | 'RON';
  callType?: 'CHI' | 'PON' | 'KAN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string[];
  warning: string[];
}

interface CallAdvisorContext {
  hand: Tile[];
  melds: Meld[];
  seatWind: WindValue;
  roundWind: WindValue;
  doraTiles: Tile[];
  openTanyaoEnabled: boolean;
  isRiichi: boolean;
  lastOpponentDiscard: OpponentDiscardEvent | null;
}

function sameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
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

function removeTiles(hand: Tile[], needed: Tile[]): Tile[] {
  const remaining = [...hand];
  for (const need of needed) {
    const index = remaining.findIndex(tile => sameTile(tile, need));
    if (index !== -1) remaining.splice(index, 1);
  }
  return remaining;
}

function toYakuContext(ctx: CallAdvisorContext, hand: Tile[], melds: Meld[], winningTile?: Tile): YakuContext {
  return {
    hand,
    melds,
    seatWind: ctx.seatWind,
    roundWind: ctx.roundWind,
    doraTiles: ctx.doraTiles,
    isRiichi: ctx.isRiichi,
    winningTile,
    openTanyaoEnabled: ctx.openTanyaoEnabled,
  };
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

function hasFragileClosedYaku(possible: string[]): boolean {
  return possible.includes('riichi') || possible.includes('pinfu') || possible.includes('iipeikou');
}

export function evaluateCallRecommendation(ctx: CallAdvisorContext): CallRecommendation {
  const discardEvent = ctx.lastOpponentDiscard;
  if (!discardEvent) {
    return {
      action: 'PASS',
      confidence: 'LOW',
      reason: ['No opponent discard is currently available to call.'],
      warning: [],
    };
  }

  const calledTile = discardEvent.tile;
  const ronResult = detectYaku({
    ...toYakuContext(ctx, [...ctx.hand, calledTile], ctx.melds, calledTile),
    winMethod: 'ron',
  });
  if (ronResult.yaku.length > 0 && (ronResult.isYakuman || ronResult.han > 0)) {
    return {
      action: 'RON',
      confidence: 'HIGH',
      reason: ['Winning tile is available right now.', `Hand scores ${ronResult.isYakuman ? 'yakuman' : `${ronResult.han} han`}.`],
      warning: [],
    };
  }

  const baselineShanten = calcShanten(ctx.hand, ctx.melds).shanten;
  const baselinePossible = suggestPossibleYaku(toYakuContext(ctx, ctx.hand, ctx.melds), {
    openTanyaoEnabled: ctx.openTanyaoEnabled,
  }).map(entry => entry.name);

  const candidates: CallRecommendation[] = [];

  const ponNeeded = [calledTile, calledTile];
  if (canRemoveTiles(ctx.hand, ponNeeded)) {
    const handAfterPon = removeTiles(ctx.hand, ponNeeded);
    const meldsAfterPon = [...ctx.melds, { type: 'pon' as const, tiles: [calledTile, calledTile, calledTile] }];
    const shanten = calcShanten(handAfterPon, meldsAfterPon).shanten;
    const yaku = suggestPossibleYaku(toYakuContext(ctx, handAfterPon, meldsAfterPon), {
      openTanyaoEnabled: ctx.openTanyaoEnabled,
    }).map(entry => entry.name);
    const reason = [`Pon keeps a ${yaku[0] ?? 'valid'} yaku path.`, `Shanten ${baselineShanten} → ${shanten}.`];
    const warning: string[] = [];
    if (hasFragileClosedYaku(baselinePossible)) {
      warning.push('Calling pon breaks closed-hand value like riichi, pinfu, or iipeikou.');
    }
    if (shanten < baselineShanten || yaku.length > 0) {
      candidates.push({
        action: 'CALL',
        callType: 'PON',
        confidence: shanten < baselineShanten ? 'HIGH' : 'MEDIUM',
        reason,
        warning,
      });
    }
  }

  if (discardEvent.position === 'left') {
    for (const option of buildChiOptions(ctx.hand, calledTile)) {
      const handAfterChi = removeTiles(ctx.hand, option.slice(0, 2));
      const meldsAfterChi = [...ctx.melds, { type: 'chi' as const, tiles: option }];
      const shanten = calcShanten(handAfterChi, meldsAfterChi).shanten;
      const yaku = suggestPossibleYaku(toYakuContext(ctx, handAfterChi, meldsAfterChi), {
        openTanyaoEnabled: ctx.openTanyaoEnabled,
      }).map(entry => entry.name);
      const warning: string[] = [];
      if (hasFragileClosedYaku(baselinePossible)) {
        warning.push('Calling chi breaks closed-hand value like riichi, pinfu, or iipeikou.');
      }
      if (shanten < baselineShanten || yaku.length > 0) {
        candidates.push({
          action: 'CALL',
          callType: 'CHI',
          confidence: shanten < baselineShanten ? 'MEDIUM' : 'LOW',
          reason: [`Chi keeps ${yaku[0] ?? 'a yaku route'} available.`, `Shanten ${baselineShanten} → ${shanten}.`],
          warning,
        });
      }
    }
  }

  const kanNeeded = [calledTile, calledTile, calledTile];
  if (canRemoveTiles(ctx.hand, kanNeeded)) {
    candidates.push({
      action: 'CALL',
      callType: 'KAN',
      confidence: 'LOW',
      reason: ['Kan is available from the discard.', 'Extra dora may increase value.'],
      warning: ['Kan can expose extra dora and increase risk.'],
    });
  }

  if (candidates.length === 0) {
    return {
      action: 'PASS',
      confidence: 'MEDIUM',
      reason: ['No call improves the hand enough or preserves a clear yaku line.'],
      warning: hasFragileClosedYaku(baselinePossible)
        ? ['Passing keeps closed-hand value like riichi or pinfu intact.']
        : [],
    };
  }

  const best = candidates.sort((a, b) => {
    const score = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return score[b.confidence] - score[a.confidence];
  })[0];
  return best;
}
