import { describe, expect, it } from 'vitest';
import { buildInitialState, gameReducer } from './useGameState';
import { parseTileNotation } from '@/lib/tileParser';
import { StartGameData, Tile } from '@/lib/types';

function tiles(input: string): Tile[] {
  return parseTileNotation(input);
}

const baseGameData: StartGameData = {
  seatWind: 'east',
  roundWind: 'east',
  isDealer: false,
  doraIndicatorStr: '',
  redFivesEnabled: true,
  openTanyaoEnabled: true,
  startingHandStr: '123m 456m 789p 55s EE',
};

describe('gameReducer', () => {
  it('tracks the latest opponent discard and consumes it on pon', () => {
    let state = buildInitialState(baseGameData, tiles('55m 123p 456p 789s EE'), []);
    const discardTile = tiles('5m')[0];

    state = gameReducer(state, {
      type: 'OPPONENT_DISCARD',
      position: 'across',
      tile: discardTile,
    });

    expect(state.lastOpponentDiscard).toEqual({ position: 'across', tile: discardTile });
    expect(state.opponents.find(opponent => opponent.position === 'across')?.discards).toHaveLength(1);

    state = gameReducer(state, {
      type: 'PON',
      meldTiles: [discardTile, tiles('5m')[0], tiles('5m')[0]],
    });

    expect(state.lastOpponentDiscard).toBeNull();
    expect(state.player.hand.filter(tile => tile.suit === 'man' && tile.value === 5)).toHaveLength(0);
    expect(state.player.melds).toHaveLength(1);
    expect(state.player.melds[0].type).toBe('pon');
    expect(state.opponents.find(opponent => opponent.position === 'across')?.discards).toHaveLength(0);
  });

  it('consumes the called discard and matching hand tiles on chi', () => {
    let state = buildInitialState(baseGameData, tiles('23m 123p 456p 789s EE'), []);
    const discardTile = tiles('4m')[0];

    state = gameReducer(state, {
      type: 'OPPONENT_DISCARD',
      position: 'left',
      tile: discardTile,
    });

    state = gameReducer(state, {
      type: 'CHI',
      meldTiles: [tiles('2m')[0], tiles('3m')[0], discardTile],
    });

    expect(state.lastOpponentDiscard).toBeNull();
    expect(state.player.hand.some(tile => tile.suit === 'man' && (tile.value === 2 || tile.value === 3))).toBe(false);
    expect(state.player.melds).toHaveLength(1);
    expect(state.player.melds[0].type).toBe('chi');
    expect(state.opponents.find(opponent => opponent.position === 'left')?.discards).toHaveLength(0);
    expect(state.phase).toBe('discard');
  });
});
