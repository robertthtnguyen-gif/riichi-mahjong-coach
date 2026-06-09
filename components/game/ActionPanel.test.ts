import { describe, expect, it } from 'vitest';
import {
  getExpectedOpponentPosition,
  getFocusActionKeys,
  validateOpponentDiscardSelection,
} from './ActionPanel';
import { Opponent } from '@/lib/types';

const eastSeatOpponents: Opponent[] = [
  { position: 'left', seatWind: 'north', discards: [], melds: [], isRiichi: false, tileCount: 13 },
  { position: 'across', seatWind: 'west', discards: [], melds: [], isRiichi: false, tileCount: 13 },
  { position: 'right', seatWind: 'south', discards: [], melds: [], isRiichi: false, tileCount: 13 },
];

describe('ActionPanel focus mode actions', () => {
  it('still exposes chi and pon in focus mode', () => {
    const keys = getFocusActionKeys();
    expect(keys).toContain('chi');
    expect(keys).toContain('pon');
    expect(keys).toContain('ron');
    expect(keys).toContain('pass');
  });
});

describe('opponent discard turn mapping', () => {
  it('waiting for right discard shows right input', () => {
    expect(getExpectedOpponentPosition('right', 'south', eastSeatOpponents)).toBe('right');
  });

  it('waiting for left discard shows left input', () => {
    expect(getExpectedOpponentPosition('left', 'north', eastSeatOpponents)).toBe('left');
  });

  it('waiting for across discard shows across input', () => {
    expect(getExpectedOpponentPosition('across', 'west', eastSeatOpponents)).toBe('across');
  });

  it('selected opponent updates after turn advances', () => {
    const first = getExpectedOpponentPosition('right', 'south', eastSeatOpponents);
    const second = getExpectedOpponentPosition('across', 'west', eastSeatOpponents);

    expect(first).toBe('right');
    expect(second).toBe('across');
    expect(second).not.toBe(first);
  });

  it('blocks stale selected opponent without override', () => {
    expect(validateOpponentDiscardSelection('left', 'right', false)).toBe(
      'It is Right player’s turn. Use Override if this is a correction.'
    );
  });

  it('allows corrected selection with override', () => {
    expect(validateOpponentDiscardSelection('left', 'right', true)).toBeNull();
  });
});
