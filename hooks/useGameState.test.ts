import { describe, expect, it } from 'vitest';
import { buildInitialState, gameReducer } from './useGameState';
import { parseTileNotation } from '@/lib/tileParser';
import { StartGameData, Tile } from '@/lib/types';

function tiles(input: string): Tile[] {
  return parseTileNotation(input);
}

const baseGameData: StartGameData = {
  seatWind: 'east',
  roundId: 'east-1',
  doraIndicatorStr: '',
  redFivesEnabled: true,
  openTanyaoEnabled: true,
  startingHandStr: '123m 456m 789p 55s EE',
};

describe('gameReducer', () => {
  it('starts from the dealer turn and detects whether it is my turn', () => {
    const eastSeat = buildInitialState({ ...baseGameData, seatWind: 'east' }, tiles(baseGameData.startingHandStr), []);
    expect(eastSeat.currentActor).toBe('east');
    expect(eastSeat.currentTurn).toBe('self');
    expect(eastSeat.phase).toBe('MY_DRAW');

    const southSeat = buildInitialState({ ...baseGameData, seatWind: 'south' }, tiles(baseGameData.startingHandStr), []);
    expect(southSeat.currentActor).toBe('east');
    expect(southSeat.currentTurn).toBe('left');
    expect(southSeat.phase).toBe('OPPONENT_TURN');
  });

  it('tracks the latest opponent discard and consumes it on pon', () => {
    let state = buildInitialState(baseGameData, tiles('55m 123p 456p 789s EE'), []);
    const discardTile = tiles('5m')[0];

    state = gameReducer(state, {
      type: 'OPPONENT_DISCARD',
      position: 'across',
      tile: discardTile,
    });

    expect(state.lastOpponentDiscard).toEqual({ position: 'across', tile: discardTile, actor: 'west' });
    expect(state.opponents.find(opponent => opponent.position === 'across')?.discards).toHaveLength(1);
    expect(state.phase).toBe('CALL_DECISION');

    state = gameReducer(state, {
      type: 'PON',
      meldTiles: [discardTile, tiles('5m')[0], tiles('5m')[0]],
    });

    expect(state.lastOpponentDiscard).toBeNull();
    expect(state.player.hand.filter(tile => tile.suit === 'man' && tile.value === 5)).toHaveLength(0);
    expect(state.player.melds).toHaveLength(1);
    expect(state.player.melds[0].type).toBe('pon');
    expect(state.opponents.find(opponent => opponent.position === 'across')?.discards).toHaveLength(0);
    expect(state.phase).toBe('MY_DISCARD');
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
    expect(state.phase).toBe('MY_DISCARD');
  });

  it('advances to the next turn when passing a call', () => {
    let state = buildInitialState(baseGameData, tiles('123m 456p 789s EE 5m'), []);
    state = gameReducer(state, {
      type: 'OPPONENT_DISCARD',
      position: 'left',
      tile: tiles('5m')[0],
    });

    state = gameReducer(state, { type: 'PASS_CALL' });
    expect(state.phase).toBe('MY_DRAW');
    expect(state.currentTurn).toBe('self');
    expect(state.currentActor).toBe('east');
  });
});
