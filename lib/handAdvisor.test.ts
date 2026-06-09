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
    expect(result.bestSpeedDiscard).toBe('E');
    expect(result.bestValueDiscard).toBe('E');
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.possibleYaku).toContain('riichi');
    expect(result.possibleYaku).toContain('pinfu');
    expect(result.targetYaku).toBe('Riichi + Pinfu');
    expect(result.recommendation[0]).toBe('Discard E for the fastest line.');
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

  it('recommends a pon when the tracked opponent discard improves the hand plan', () => {
    const result = analyzeHand({
      hand: tiles('EE 123p 456p 789s 55m'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: false,
      openTanyaoEnabled: true,
      lastOpponentDiscard: { position: 'across', tile: tiles('E')[0], actor: 'west' },
    });

    expect(result.callRecommendation).toContain('Pon E is viable.');
  });

  it('recommends passing when the tracked discard does not create a good call', () => {
    const result = analyzeHand({
      hand: tiles('123m 456m 23p 678s 55p'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: false,
      openTanyaoEnabled: true,
      lastOpponentDiscard: { position: 'across', tile: tiles('9m')[0], actor: 'west' },
    });

    expect(result.callRecommendation).toEqual(['Pass and draw.']);
  });

  it('produces a discard recommendation after my draw phase hand update', () => {
    const result = analyzeHand({
      hand: tiles('123m 456m 23p 678s 55p E'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: true,
      openTanyaoEnabled: true,
    });

    expect(result.bestDiscard).toBe('E');
    expect(result.bestSpeedDiscard).toBe('E');
  });

  it('explains the speed versus value trade-off for the yakuhai hand', () => {
    const result = analyzeHand({
      hand: tiles('EEE 345m 4s 6s'),
      melds: [meld('pon', 'RRR'), meld('pon', 'SSS')],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      isRiichi: false,
      isTsumo: false,
      openTanyaoEnabled: true,
    });

    expect(result.bestSpeedDiscard).toBe('E');
    expect(['4s', '6s']).toContain(result.bestValueDiscard);
    expect(result.bestDiscard).toBe('E');
    expect(result.strategyRecommendations.aggressive.discard).toBe('E');
    expect(['4s', '6s']).toContain(result.strategyRecommendations.conservative.discard);
    expect(result.strategyRecommendations.balanced.discard).toBe('E');
    expect(result.recommendation).toContain(
      'Discarding E breaks the East triplet, reducing value, but improves the wait from a single pair wait to a 5s wait.'
    );
    expect(result.strategyRecommendations.conservative.explanation.join(' ')).toContain(
      'keeps 3 han of value tiles'
    );
    expect(result.discardOptions[0]?.tile).toBe('E');
  });
});
