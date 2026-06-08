// lib/shanten.ts

import { Tile, Meld, WindValue, DragonValue } from './types';

export type HandType = 'standard' | 'chiitoitsu' | 'kokushi';

export interface ShantenResult {
  shanten: number;
  handType: HandType;
}

// Kokushi terminal/honor indices: 1m,9m,1p,9p,1s,9s,E,S,W,N,R,G,Wh
const KOKUSHI = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33] as const;

const WIND_INDEX: Record<WindValue, number> = { east: 0, south: 1, west: 2, north: 3 };
const DRAGON_INDEX: Record<DragonValue, number> = { red: 0, green: 1, white: 2 };

function tileToIndex(tile: Tile): number {
  if (tile.suit === 'man') return (tile.value as number) - 1;
  if (tile.suit === 'pin') return 9 + (tile.value as number) - 1;
  if (tile.suit === 'sou') return 18 + (tile.value as number) - 1;
  if (tile.suit === 'wind') return 27 + WIND_INDEX[tile.value as WindValue];
  return 31 + DRAGON_INDEX[tile.value as DragonValue];
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
    const pos = i % 9; // position within suit (0–8); irrelevant for honors since guarded by !honor

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
  const openMelds = melds.filter(m => m.type !== 'closed-kan').length;

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
