// lib/shanten.test.ts

import { describe, it, expect } from 'vitest';
import { calcShanten } from './shanten';
import { Tile, WindValue, DragonValue } from './types';

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

describe('calcShanten — standard hand', () => {
  it('complete hand (14 tiles): shanten -1', () => {
    // 1m2m3m 4p5p6p 7s8s9s EEE RR
    const hand: Tile[] = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(-1);
    expect(r.handType).toBe('standard');
  });

  it('tenpai (13 tiles): shanten 0', () => {
    // 1m2m3m 4p5p6p 7s8s9s EE RR — 3 melds + pair (EE) + taatsu (RR)
    const hand: Tile[] = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8), t('sou', 9),
      w('east'), w('east'),
      d('red'), d('red'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(0);
    expect(r.handType).toBe('standard');
  });

  it('1-shanten (13 tiles): shanten 1', () => {
    // 1m2m3m 4p5p6p 7s8s EE RR W — 2 melds + 2 taatsu (7s8s, RR) + pair (EE) + float (W)
    const hand: Tile[] = [
      t('man', 1), t('man', 2), t('man', 3),
      t('pin', 4), t('pin', 5), t('pin', 6),
      t('sou', 7), t('sou', 8),
      w('east'), w('east'),
      d('red'), d('red'),
      w('west'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(1);
  });
});

describe('calcShanten — chiitoitsu (seven pairs)', () => {
  it('tenpai (13 tiles): shanten 0', () => {
    // 11m 22p 33s 44m 55p 66s 7m — 6 pairs + 1 floating
    const hand: Tile[] = [
      t('man', 1), t('man', 1),
      t('pin', 2), t('pin', 2),
      t('sou', 3), t('sou', 3),
      t('man', 4), t('man', 4),
      t('pin', 5), t('pin', 5),
      t('sou', 6), t('sou', 6),
      t('man', 7),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(0);
    expect(r.handType).toBe('chiitoitsu');
  });

  it('complete (14 tiles): shanten -1', () => {
    // 11m 22p 33s 44m 55p 66s 77m — 7 pairs
    const hand: Tile[] = [
      t('man', 1), t('man', 1),
      t('pin', 2), t('pin', 2),
      t('sou', 3), t('sou', 3),
      t('man', 4), t('man', 4),
      t('pin', 5), t('pin', 5),
      t('sou', 6), t('sou', 6),
      t('man', 7), t('man', 7),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(-1);
    expect(r.handType).toBe('chiitoitsu');
  });
});

describe('calcShanten — kokushi (thirteen orphans)', () => {
  it('tenpai (13 tiles, all 13 unique orphans): shanten 0', () => {
    // 1m 9m 1p 9p 1s 9s E S W N R G Wh
    const hand: Tile[] = [
      t('man', 1), t('man', 9),
      t('pin', 1), t('pin', 9),
      t('sou', 1), t('sou', 9),
      w('east'), w('south'), w('west'), w('north'),
      d('red'), d('green'), d('white'),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(0);
    expect(r.handType).toBe('kokushi');
  });

  it('1-shanten (12 unique orphans, no pair): shanten 1', () => {
    // 1m 9m 1p 9p 1s 9s E S W N R G 2m — missing Wh, 2m is non-orphan
    const hand: Tile[] = [
      t('man', 1), t('man', 9),
      t('pin', 1), t('pin', 9),
      t('sou', 1), t('sou', 9),
      w('east'), w('south'), w('west'), w('north'),
      d('red'), d('green'),
      t('man', 2),
    ];
    const r = calcShanten(hand);
    expect(r.shanten).toBe(1);
    expect(r.handType).toBe('kokushi');
  });
});
