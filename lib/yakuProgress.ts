import { Meld, Tile, WindValue } from './types';
import { YakuName } from './yaku';

export interface YakuProgressStep {
  label: string;
  complete: boolean;
}

export interface YakuProgress {
  target: YakuName;
  steps: YakuProgressStep[];
}

function isHonor(tile: Tile): boolean {
  return tile.suit === 'wind' || tile.suit === 'dragon';
}

function isTerminal(tile: Tile): boolean {
  return (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') &&
    ((tile.value as number) === 1 || (tile.value as number) === 9);
}

function isSimple(tile: Tile): boolean {
  return !isHonor(tile) && !isTerminal(tile);
}

function isValuePairTile(tile: Tile, seatWind: WindValue, roundWind: WindValue): boolean {
  if (tile.suit === 'dragon') {
    return true;
  }
  if (tile.suit !== 'wind') {
    return false;
  }
  return tile.value === seatWind || tile.value === roundWind;
}

function countTileLabels(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const label =
      tile.suit === 'wind'
        ? `wind:${tile.value}`
        : tile.suit === 'dragon'
        ? `dragon:${tile.value}`
        : `${tile.suit}:${tile.value}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

function countGreedySequences(tiles: Tile[]): number {
  const counts = Array.from({ length: 3 }, () => new Array(10).fill(0));
  for (const tile of tiles) {
    if (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') {
      const suitIndex = tile.suit === 'man' ? 0 : tile.suit === 'pin' ? 1 : 2;
      counts[suitIndex][tile.value as number] += 1;
    }
  }

  let total = 0;
  for (let suit = 0; suit < 3; suit += 1) {
    for (let start = 1; start <= 7; start += 1) {
      while (counts[suit][start] > 0 && counts[suit][start + 1] > 0 && counts[suit][start + 2] > 0) {
        counts[suit][start] -= 1;
        counts[suit][start + 1] -= 1;
        counts[suit][start + 2] -= 1;
        total += 1;
      }
    }
  }
  return total;
}

function hasValuelessPair(tiles: Tile[], seatWind: WindValue, roundWind: WindValue): boolean {
  const counts = countTileLabels(tiles);
  for (const tile of tiles) {
    const label =
      tile.suit === 'wind'
        ? `wind:${tile.value}`
        : tile.suit === 'dragon'
        ? `dragon:${tile.value}`
        : `${tile.suit}:${tile.value}`;
    if ((counts.get(label) ?? 0) >= 2 && !isValuePairTile(tile, seatWind, roundWind)) {
      return true;
    }
  }
  return false;
}

function hasTwoSidedPotential(tiles: Tile[]): boolean {
  const counts = Array.from({ length: 3 }, () => new Array(10).fill(0));
  for (const tile of tiles) {
    if (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') {
      const suitIndex = tile.suit === 'man' ? 0 : tile.suit === 'pin' ? 1 : 2;
      counts[suitIndex][tile.value as number] += 1;
    }
  }

  for (let suit = 0; suit < 3; suit += 1) {
    for (let start = 2; start <= 7; start += 1) {
      if (counts[suit][start] > 0 && counts[suit][start + 1] > 0) {
        return true;
      }
    }
  }
  return false;
}

export function inferPrimaryTarget(targetYaku: string): YakuName | null {
  const normalized = targetYaku.toLowerCase();
  const priority: Array<[YakuName, string]> = [
    ['pinfu', 'pinfu'],
    ['chiitoitsu', 'chiitoitsu'],
    ['chinitsu', 'chinitsu'],
    ['honitsu', 'honitsu'],
    ['yakuhai', 'yakuhai'],
    ['tanyao', 'tanyao'],
    ['riichi', 'riichi'],
  ];

  for (const [id, needle] of priority) {
    if (normalized.includes(needle)) {
      return id;
    }
  }

  return null;
}

export function buildYakuProgress(
  target: YakuName | null,
  hand: Tile[],
  melds: Meld[],
  seatWind: WindValue,
  roundWind: WindValue,
  possibleYaku: YakuName[],
  currentYaku: YakuName[]
): YakuProgress | null {
  if (!target) {
    return null;
  }

  const allTiles = [...hand, ...melds.flatMap(meld => meld.tiles)];
  const sequenceMelds = melds.filter(meld => meld.type === 'chi').length;
  const totalSequences = sequenceMelds + countGreedySequences(hand);
  const counts = countTileLabels(allTiles);

  switch (target) {
    case 'pinfu':
      return {
        target,
        steps: [
          { label: 'Closed hand', complete: melds.length === 0 },
          { label: 'Four sequences', complete: totalSequences >= 4 },
          { label: 'Valueless pair', complete: hasValuelessPair(allTiles, seatWind, roundWind) },
          { label: 'Two-sided wait', complete: hasTwoSidedPotential(hand) },
        ],
      };
    case 'tanyao':
      return {
        target,
        steps: [
          { label: 'No terminals', complete: allTiles.every(tile => !isTerminal(tile)) },
          { label: 'No honors', complete: allTiles.every(tile => !isHonor(tile)) },
          { label: 'Simple shapes preserved', complete: allTiles.every(tile => isSimple(tile)) },
        ],
      };
    case 'riichi':
      return {
        target,
        steps: [
          { label: 'Closed hand', complete: melds.length === 0 },
          { label: 'Tenpai line available', complete: possibleYaku.includes('riichi') || currentYaku.includes('riichi') },
          { label: 'No forced open calls', complete: melds.length === 0 },
        ],
      };
    case 'yakuhai':
      return {
        target,
        steps: [
          {
            label: 'Value honor pair/triplet',
            complete: allTiles.some(
              tile =>
                isValuePairTile(tile, seatWind, roundWind) &&
                (counts.get(
                  tile.suit === 'wind'
                    ? `wind:${tile.value}`
                    : `dragon:${tile.value}`
                ) ?? 0) >= 2
            ),
          },
          {
            label: 'Triplet or pon path',
            complete: possibleYaku.includes('yakuhai') || currentYaku.includes('yakuhai'),
          },
        ],
      };
    case 'honitsu':
    case 'chinitsu': {
      const suited = allTiles.filter(tile => !isHonor(tile));
      const suitSet = new Set(suited.map(tile => tile.suit));
      return {
        target,
        steps: [
          { label: 'One suit focus', complete: suitSet.size <= 1 },
          { label: 'Off-suit tiles cleared', complete: suitSet.size <= 1 },
          {
            label: target === 'honitsu' ? 'Honors still allowed' : 'No honors',
            complete: target === 'honitsu' ? true : allTiles.every(tile => !isHonor(tile)),
          },
        ],
      };
    }
    case 'chiitoitsu': {
      let pairCount = 0;
      for (const count of counts.values()) {
        if (count >= 2) {
          pairCount += 1;
        }
      }
      return {
        target,
        steps: [
          { label: 'Closed hand', complete: melds.length === 0 },
          { label: 'Multiple pair shapes', complete: pairCount >= 4 },
          { label: 'Distinct pair route', complete: pairCount >= 6 },
        ],
      };
    }
    default:
      return {
        target,
        steps: [
          { label: 'Yaku line identified', complete: possibleYaku.includes(target) || currentYaku.includes(target) },
        ],
      };
  }
}
