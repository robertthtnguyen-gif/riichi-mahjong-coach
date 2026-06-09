import { describe, expect, it } from 'vitest';
import { evaluateCallRecommendation } from './callAdvisor';
import { parseTileNotation } from './tileParser';
import { Tile } from './types';

function tiles(input: string): Tile[] {
  return parseTileNotation(input);
}

describe('evaluateCallRecommendation', () => {
  it('allows chi only from the left opponent discard', () => {
    const left = evaluateCallRecommendation({
      hand: tiles('23m 456p 789s EE 55m'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      openTanyaoEnabled: true,
      isRiichi: false,
      lastOpponentDiscard: { position: 'left', tile: tiles('4m')[0], actor: 'north' },
    });
    expect(left.callType).toBe('CHI');

    const across = evaluateCallRecommendation({
      hand: tiles('23m 456p 789s EE 55m'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      openTanyaoEnabled: true,
      isRiichi: false,
      lastOpponentDiscard: { position: 'across', tile: tiles('4m')[0], actor: 'west' },
    });
    expect(across.callType).not.toBe('CHI');
  });

  it('allows pon from any opponent discard', () => {
    const result = evaluateCallRecommendation({
      hand: tiles('EE 123p 456p 78s 55m'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      openTanyaoEnabled: true,
      isRiichi: false,
      lastOpponentDiscard: { position: 'across', tile: tiles('E')[0], actor: 'west' },
    });

    expect(result.action).toBe('CALL');
    expect(result.callType).toBe('PON');
  });

  it('returns ron when the discard completes a winning hand', () => {
    const result = evaluateCallRecommendation({
      hand: tiles('123m 456m 23p 678s 55p'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: [],
      openTanyaoEnabled: true,
      isRiichi: true,
      lastOpponentDiscard: { position: 'across', tile: tiles('4p')[0], actor: 'west' },
    });

    expect(result.action).toBe('RON');
    expect(result.confidence).toBe('HIGH');
  });

  it('passes when pon only preserves dora and breaks a closed riichi/pinfu line', () => {
    const result = evaluateCallRecommendation({
      hand: tiles('1m 2m 3m 4m 5m 6m 3s 4s 7s 9s N N 9s'),
      melds: [],
      seatWind: 'east',
      roundWind: 'south',
      doraTiles: tiles('9s'),
      openTanyaoEnabled: true,
      isRiichi: false,
      lastOpponentDiscard: { position: 'across', tile: tiles('9s')[0], actor: 'west' },
    });

    expect(result.action).toBe('PASS');
    expect(result.callType).toBeUndefined();
    expect(result.warning).toContain('Calling opens your hand and loses Riichi/Pinfu. Dora alone is not a yaku.');
  });
});
