import { describe, expect, it } from 'vitest';
import { parseTileNotation } from './tileParser';
import {
  validateDrawnHand,
  validateHandInput,
  validateSingleTile,
  validateStartingHand,
} from './tileValidator';

describe('parseTileNotation', () => {
  it('parses compact suited groups, repeated honors, and red fives into tile objects', () => {
    const tiles = parseTileNotation('123m 456p 789s EE RR 0m 0p 0s Wh');

    expect(tiles).toHaveLength(17);
    expect(tiles.map(tile => [tile.suit, tile.value, tile.isRed])).toEqual([
      ['man', 1, false],
      ['man', 2, false],
      ['man', 3, false],
      ['pin', 4, false],
      ['pin', 5, false],
      ['pin', 6, false],
      ['sou', 7, false],
      ['sou', 8, false],
      ['sou', 9, false],
      ['wind', 'east', false],
      ['wind', 'east', false],
      ['dragon', 'red', false],
      ['dragon', 'red', false],
      ['man', 5, true],
      ['pin', 5, true],
      ['sou', 5, true],
      ['dragon', 'white', false],
    ]);
    expect(tiles[14]).toMatchObject({ suit: 'pin', value: 5, isRed: true });
    expect(tiles[15]).toMatchObject({ suit: 'sou', value: 5, isRed: true });
    expect(tiles[16].id).toMatch(/^dragon-white-/);
  });

  it('parses repeated white dragons', () => {
    const tiles = parseTileNotation('WhWh');

    expect(tiles).toHaveLength(2);
    expect(tiles.every(tile => tile.suit === 'dragon' && tile.value === 'white')).toBe(true);
  });

  it('rejects invalid suited notation and mixed honor tokens', () => {
    expect(() => parseTileNotation('10m')).toThrow('Invalid tile notation: "10m"');
    expect(() => parseTileNotation('0m5m')).toThrow('Invalid tile notation: "0m5m"');
    expect(() => parseTileNotation('ES')).toThrow('Invalid tile notation: "ES"');
  });
});

describe('hand validation', () => {
  it('accepts a valid 13-tile starting hand', () => {
    const result = validateStartingHand('123m 456p 789s EE RR', true);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.tiles).toHaveLength(13);
  });

  it('accepts a valid 14-tile hand after draw', () => {
    const result = validateDrawnHand('123m 456p 789s EEE RR', true);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.tiles).toHaveLength(14);
  });

  it('rejects a starting hand with the wrong tile count', () => {
    const result = validateHandInput('123m 456p 789s EE', true);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Hand must have exactly 13 tiles (found 11).');
  });

  it('rejects a drawn hand with the wrong tile count', () => {
    const result = validateDrawnHand('123m 456p 789s EE RR', true);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Hand must have exactly 14 tiles (found 13).');
  });

  it('rejects more than four copies of the same tile', () => {
    const result = validateStartingHand('11111m 456p 789s EE', true);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Too many copies of 1m (5). Maximum is 4.');
  });

  it('counts red fives and normal fives toward the same copy limit', () => {
    const result = validateStartingHand('0m 5555m 456p 789s EE', true);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Too many copies of 5m (5). Maximum is 4.');
  });

  it('rejects red fives when disabled', () => {
    const result = validateStartingHand('123m 456p 789s EE 0p R', false);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Red fives (0m/0p/0s) are not enabled in this game.');
  });
});

describe('single tile validation', () => {
  it('accepts a single tile', () => {
    const result = validateSingleTile('Wh');

    expect(result.valid).toBe(true);
    expect(result.tiles).toHaveLength(1);
    expect(result.tiles[0]).toMatchObject({ suit: 'dragon', value: 'white', isRed: false });
  });

  it('rejects multiple tiles', () => {
    const result = validateSingleTile('EE');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Expected exactly 1 tile, found 2.');
  });
});
