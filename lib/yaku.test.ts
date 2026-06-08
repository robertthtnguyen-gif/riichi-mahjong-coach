import { describe, expect, it } from 'vitest';
import { parseTileNotation } from './tileParser';
import { detectYaku, YakuContext, YakuName } from './yaku';
import { Meld, Tile } from './types';

function tiles(input: string): Tile[] {
  return parseTileNotation(input);
}

function meld(type: Meld['type'], input: string): Meld {
  return { type, tiles: tiles(input) };
}

function ctx(
  handInput: string,
  overrides: Partial<YakuContext> = {}
): YakuContext {
  return {
    hand: tiles(handInput),
    melds: [],
    seatWind: 'east',
    roundWind: 'south',
    doraTiles: [],
    isRiichi: false,
    isTsumo: false,
    ...overrides,
  };
}

function expectYaku(result: ReturnType<typeof detectYaku>, name: YakuName, han?: number): void {
  const entry = result.yaku.find(yaku => yaku.name === name);
  expect(entry).toBeDefined();
  if (han !== undefined) {
    expect(entry?.han).toBe(han);
  }
}

describe('detectYaku', () => {
  it('detects riichi', () => {
    const result = detectYaku(ctx('123m 456m 234p 678s 11p', { isRiichi: true }));

    expectYaku(result, 'riichi', 1);
  });

  it('detects menzen tsumo', () => {
    const result = detectYaku(ctx('123m 456m 234p 678s 11p', { isTsumo: true }));

    expectYaku(result, 'menzen-tsumo', 1);
  });

  it('detects tanyao', () => {
    const result = detectYaku(ctx('234m 345m 456p 678s 66p'));

    expectYaku(result, 'tanyao', 1);
  });

  it('detects pinfu', () => {
    const result = detectYaku(ctx('123m 456m 234p 678s 11p'));

    expectYaku(result, 'pinfu', 1);
  });

  it('detects yakuhai', () => {
    const result = detectYaku(ctx('123m 456p 789s RRR 22m'));

    expectYaku(result, 'yakuhai', 1);
  });

  it('detects iipeikou', () => {
    const result = detectYaku(ctx('123m 123m 456p 789s 55p'));

    expectYaku(result, 'iipeikou', 1);
  });

  it('detects chiitoitsu', () => {
    const result = detectYaku(ctx('22m 33m 44p 55p 66s 77s WhWh'));

    expectYaku(result, 'chiitoitsu', 2);
  });

  it('detects toitoi', () => {
    const result = detectYaku(ctx('111m 222p 333s RRR 55m'));

    expectYaku(result, 'toitoi', 2);
  });

  it('detects honitsu', () => {
    const result = detectYaku(ctx('111m 234m 678m RRR 11m'));

    expectYaku(result, 'honitsu', 3);
  });

  it('detects chinitsu', () => {
    const result = detectYaku(ctx('123m 234m 456m 678m 55m'));

    expectYaku(result, 'chinitsu', 6);
  });

  it('detects ittsu', () => {
    const result = detectYaku(ctx('123m 456m 789m 234p 55s'));

    expectYaku(result, 'ittsu', 2);
  });

  it('detects sanshoku doujun', () => {
    const result = detectYaku(ctx('123m 123p 123s 456m 77p'));

    expectYaku(result, 'sanshoku-doujun', 2);
  });

  it('detects dora from indicators', () => {
    const result = detectYaku(
      ctx('123m 456p 789s RRR 22m', { doraTiles: tiles('4p') })
    );

    expectYaku(result, 'dora', 1);
  });

  it('detects red dora', () => {
    const result = detectYaku(ctx('123m 4p 0p 6p 789s RRR 22m'));

    expectYaku(result, 'red-dora', 1);
  });

  it('reduces han correctly for open yaku that can be open', () => {
    const result = detectYaku(
      ctx('456m 789m 55s', {
        melds: [meld('chi', '123m'), meld('chi', '123p')],
      })
    );

    expect(result.warnings).toEqual([]);
    expectYaku(result, 'ittsu', 1);
  });

  it('warns when no yaku exists', () => {
    const result = detectYaku(ctx('123m 456m 789p 999s 11m'));

    expect(result.yaku).toEqual([]);
    expect(result.han).toBe(0);
    expect(result.warnings).toContain('No yaku exists for this hand.');
  });
});
