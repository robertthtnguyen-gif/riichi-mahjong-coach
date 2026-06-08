import { describe, expect, it } from 'vitest';
import { parseTileNotation } from './tileParser';
import { analyzeHand } from './handAdvisor';
import { Meld, Tile } from './types';

function tiles(input: string): Tile[] {
  return parseTileNotation(input);
}

function meld(type: Meld['type'], input: string): Meld {
  return { type, tiles: tiles(input) };
}

describe('analyzeHand', () => {
  it('reports shanten, ukeire, and closed-hand yaku hints for a 13-tile hand', () => {
    const result = analyzeHand({
      hand: tiles('123m 456m 23p 678s 55p'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: false,
      openTanyaoEnabled: true,
    });

    expect(result.shanten).toBe(0);
    expect(result.ukeire).toBe(8);
    expect(result.bestDiscard).toBeNull();
    expect(result.possibleYaku).toContain('riichi');
    expect(result.possibleYaku).toContain('pinfu');
    expect(result.targetYaku).toBe('Riichi + Pinfu');
    expect(result.recommendation).toEqual(['Keep hand closed.', 'Do not Pon.']);
  });

  it('recommends discarding an isolated honor from a 14-tile closed hand', () => {
    const result = analyzeHand({
      hand: tiles('123m 456m 23p 678s 55p E'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: false,
      openTanyaoEnabled: true,
    });

    expect(result.shanten).toBe(0);
    expect(result.ukeire).toBe(8);
    expect(result.bestDiscard).toBe('E');
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.possibleYaku).toContain('riichi');
    expect(result.possibleYaku).toContain('pinfu');
    expect(result.targetYaku).toBe('Riichi + Pinfu');
    expect(result.recommendation).toEqual(['Keep hand closed.', 'Do not Pon.']);
  });

  it('warns when an open hand has no clear yaku line', () => {
    const result = analyzeHand({
      hand: tiles('123m 456p 789s 1m'),
      melds: [meld('chi', '345m')],
      seatWind: 'west',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: false,
      openTanyaoEnabled: false,
    });

    expect(result.bestDiscard).toBeNull();
    expect(result.possibleYaku).toEqual([]);
    expect(result.warnings).toContain('No clear yaku line yet.');
  });
});
