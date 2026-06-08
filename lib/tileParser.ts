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

function parseRepeatedHonorToken(
  token: string,
  counter: { n: number }
): Tile[] | null {
  const repeatedHonorMatchers: Array<{
    pattern: RegExp;
    suit: Suit;
    value: WindValue | DragonValue;
  }> = [
    { pattern: /^E+$/, suit: 'wind', value: 'east' },
    { pattern: /^S+$/, suit: 'wind', value: 'south' },
    { pattern: /^W+$/, suit: 'wind', value: 'west' },
    { pattern: /^N+$/, suit: 'wind', value: 'north' },
    { pattern: /^R+$/, suit: 'dragon', value: 'red' },
    { pattern: /^G+$/, suit: 'dragon', value: 'green' },
    { pattern: /^(Wh)+$/, suit: 'dragon', value: 'white' },
  ];

  for (const matcher of repeatedHonorMatchers) {
    if (!matcher.pattern.test(token)) {
      continue;
    }

    const count = matcher.value === 'white' ? token.length / 2 : token.length;
    return Array.from({ length: count }, () =>
      makeTile(matcher.suit, matcher.value, false, counter)
    );
  }

  return null;
}

/**
 * Parses Riichi Mahjong tile notation into Tile objects.
 *
 * Supported tokens:
 *   - Suited groups: "123m", "456p", "789s" (digits followed by m/p/s)
 *   - Red fives: "0m", "0p", "0s"
 *   - Wind tiles: "E", "S", "W", "N" and repeated groups like "EE"
 *   - Dragon tiles: "R", "G", "Wh" and repeated groups like "RR", "WhWh"
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

    const repeatedHonors = parseRepeatedHonorToken(token, counter);
    if (repeatedHonors !== null) {
      tiles.push(...repeatedHonors);
      continue;
    }

    const suitMatch = token.match(/^([1-9]+)([mps])$/);
    if (suitMatch) {
      const suit = SUIT_MAP[suitMatch[2]];
      for (const ch of suitMatch[1]) {
        const num = parseInt(ch, 10);
        tiles.push(makeTile(suit, num, false, counter));
      }
      continue;
    }

    const redFiveMatch = token.match(/^0([mps])$/);
    if (redFiveMatch) {
      const suit = SUIT_MAP[redFiveMatch[1]];
      tiles.push(makeTile(suit, 5, true, counter));
      continue;
    }

    throw new Error(`Invalid tile notation: "${token}"`);
  }

  return tiles;
}
