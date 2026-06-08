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
