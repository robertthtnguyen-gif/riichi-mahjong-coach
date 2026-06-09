'use client';

import { useReducer } from 'react';
import {
  GameState,
  Tile,
  OpponentPosition,
  RoundId,
  WindValue,
  StartGameData,
  OpponentDiscardEvent,
  TableActor,
} from '@/lib/types';

type GameAction =
  | { type: 'DRAW_TILE'; tile: Tile }
  | { type: 'DISCARD_TILE'; tileId: string }
  | { type: 'CHI'; meldTiles: [Tile, Tile, Tile] }
  | { type: 'PON'; meldTiles: [Tile, Tile, Tile] }
  | { type: 'KAN'; meldTiles: Tile[] }
  | { type: 'RIICHI'; tileId: string }
  | { type: 'RON' }
  | { type: 'TSUMO' }
  | { type: 'PASS_CALL' }
  | { type: 'OPPONENT_DISCARD'; position: OpponentPosition; tile: Tile }
  | { type: 'OPPONENT_RIICHI'; position: OpponentPosition }
  | { type: 'OPPONENT_MELD'; position: OpponentPosition; meldType: 'chi' | 'pon' | 'kan'; tiles: Tile[] };

const WIND_ORDER: WindValue[] = ['east', 'south', 'west', 'north'];

function roundWindFromId(roundId: RoundId): WindValue {
  return roundId.startsWith('east') ? 'east' : 'south';
}

function nextWind(wind: WindValue): WindValue {
  return WIND_ORDER[(WIND_ORDER.indexOf(wind) + 1) % 4];
}

function actorFromWind(playerSeat: WindValue, actor: WindValue): TableActor {
  if (actor === playerSeat) {
    return 'self';
  }
  const playerIndex = WIND_ORDER.indexOf(playerSeat);
  const actorIndex = WIND_ORDER.indexOf(actor);
  const diff = (actorIndex - playerIndex + 4) % 4;
  if (diff === 1) return 'right';
  if (diff === 2) return 'across';
  return 'left';
}

function phaseForActor(playerSeat: WindValue, actor: WindValue): GameState['phase'] {
  return actor === playerSeat ? 'MY_DRAW' : 'OPPONENT_TURN';
}

function removeById(hand: Tile[], id: string): Tile[] {
  const idx = hand.findIndex(t => t.id === id);
  if (idx === -1) return hand;
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

function sameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

function removeMatchingTiles(hand: Tile[], tilesToRemove: Tile[]): Tile[] {
  const remaining = [...hand];

  for (const tileToRemove of tilesToRemove) {
    const index = remaining.findIndex(tile => sameTile(tile, tileToRemove));
    if (index === -1) {
      return hand;
    }
    remaining.splice(index, 1);
  }

  return remaining;
}

function tilesConsumedFromCall(meldTiles: Tile[], calledTile: Tile | null, count: number): Tile[] {
  const remaining = [...meldTiles];

  if (calledTile) {
    const calledIndex = remaining.findIndex(tile => sameTile(tile, calledTile));
    if (calledIndex !== -1) {
      remaining.splice(calledIndex, 1);
    }
  }

  return remaining.slice(0, count);
}

function consumeLastOpponentDiscard(
  opponents: GameState['opponents'],
  discardEvent: OpponentDiscardEvent | null
): GameState['opponents'] {
  if (!discardEvent) {
    return opponents;
  }

  return opponents.map(opponent => {
    if (opponent.position !== discardEvent.position || opponent.discards.length === 0) {
      return opponent;
    }

    const lastDiscard = opponent.discards[opponent.discards.length - 1];
    if (!sameTile(lastDiscard, discardEvent.tile)) {
      return opponent;
    }

    return {
      ...opponent,
      discards: opponent.discards.slice(0, -1),
    };
  });
}

function buildNextTurnState(state: GameState, actor: WindValue): Pick<GameState, 'currentActor' | 'currentTurn' | 'phase'> {
  return {
    currentActor: actor,
    currentTurn: actorFromWind(state.player.seatWind, actor),
    phase: phaseForActor(state.player.seatWind, actor),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DRAW_TILE':
      return {
        ...state,
        phase: 'MY_DISCARD',
        currentActor: state.player.seatWind,
        currentTurn: 'self',
        drawnTile: action.tile,
        lastOpponentDiscard: null,
        player: {
          ...state.player,
          hand: [...state.player.hand, action.tile],
        },
      };

    case 'DISCARD_TILE': {
      const nextActor = nextWind(state.currentActor);
      return {
        ...state,
        ...buildNextTurnState(state, nextActor),
        drawnTile: null,
        lastOpponentDiscard: null,
        turnCount: state.turnCount + 1,
        player: {
          ...state.player,
          hand: removeById(state.player.hand, action.tileId),
          discards: [
            ...state.player.discards,
            state.player.hand.find(t => t.id === action.tileId)!,
          ].filter(Boolean),
        },
      };
    }

    case 'RIICHI': {
      const nextActor = nextWind(state.currentActor);
      const discarded = state.player.hand.find(t => t.id === action.tileId);
      return {
        ...state,
        ...buildNextTurnState(state, nextActor),
        drawnTile: null,
        lastOpponentDiscard: null,
        turnCount: state.turnCount + 1,
        player: {
          ...state.player,
          isRiichi: true,
          hand: removeById(state.player.hand, action.tileId),
          discards: discarded
            ? [...state.player.discards, discarded]
            : state.player.discards,
        },
      };
    }

    case 'CHI': {
      const calledTile = state.lastOpponentDiscard?.tile ?? null;
      const concealedTiles = tilesConsumedFromCall(action.meldTiles, calledTile, 2);

      return {
        ...state,
        phase: 'MY_DISCARD',
        currentActor: state.player.seatWind,
        currentTurn: 'self',
        drawnTile: null,
        lastOpponentDiscard: null,
        opponents: consumeLastOpponentDiscard(state.opponents, state.lastOpponentDiscard),
        player: {
          ...state.player,
          hand: removeMatchingTiles(state.player.hand, concealedTiles),
          melds: [...state.player.melds, { type: 'chi', tiles: action.meldTiles }],
        },
      };
    }

    case 'PON': {
      const calledTile = state.lastOpponentDiscard?.tile ?? null;
      const concealedTiles = tilesConsumedFromCall(action.meldTiles, calledTile, 2);

      return {
        ...state,
        phase: 'MY_DISCARD',
        currentActor: state.player.seatWind,
        currentTurn: 'self',
        drawnTile: null,
        lastOpponentDiscard: null,
        opponents: consumeLastOpponentDiscard(state.opponents, state.lastOpponentDiscard),
        player: {
          ...state.player,
          hand: removeMatchingTiles(state.player.hand, concealedTiles),
          melds: [...state.player.melds, { type: 'pon', tiles: action.meldTiles }],
        },
      };
    }

    case 'KAN':
      return {
        ...state,
        phase: 'MY_DISCARD',
        currentActor: state.player.seatWind,
        currentTurn: 'self',
        lastOpponentDiscard: null,
        player: {
          ...state.player,
          melds: [...state.player.melds, { type: 'kan', tiles: action.meldTiles }],
        },
      };

    case 'PASS_CALL': {
      const nextActor = state.lastOpponentDiscard ? nextWind(state.lastOpponentDiscard.actor) : nextWind(state.currentActor);
      return {
        ...state,
        ...buildNextTurnState(state, nextActor),
        lastOpponentDiscard: null,
        drawnTile: null,
      };
    }

    case 'RON':
    case 'TSUMO':
      return {
        ...state,
        phase: 'HAND_END',
      };

    case 'OPPONENT_DISCARD': {
      const opponent = state.opponents.find(o => o.position === action.position);
      const actor = opponent?.seatWind ?? state.currentActor;
      return {
        ...state,
        currentActor: actor,
        currentTurn: action.position,
        phase: 'CALL_DECISION',
        lastOpponentDiscard: { position: action.position, tile: action.tile, actor },
        opponents: state.opponents.map(o =>
          o.position === action.position
            ? {
                ...o,
                discards: [...o.discards, action.tile],
                tileCount: Math.max(0, o.tileCount - 1),
              }
            : o
        ),
      };
    }

    case 'OPPONENT_RIICHI':
      return {
        ...state,
        opponents: state.opponents.map(o =>
          o.position === action.position ? { ...o, isRiichi: true } : o
        ),
      };

    case 'OPPONENT_MELD':
      return {
        ...state,
        lastOpponentDiscard: null,
        phase: 'OPPONENT_TURN',
        opponents: state.opponents.map(o =>
          o.position === action.position
            ? {
                ...o,
                melds: [...o.melds, { type: action.meldType, tiles: action.tiles }],
              }
            : o
        ),
      };

    default:
      return state;
  }
}

function getOpponentWinds(playerSeat: WindValue): [WindValue, WindValue, WindValue] {
  const idx = WIND_ORDER.indexOf(playerSeat);
  return [
    WIND_ORDER[(idx + 3) % 4],
    WIND_ORDER[(idx + 2) % 4],
    WIND_ORDER[(idx + 1) % 4],
  ];
}

export function buildInitialState(
  data: StartGameData,
  hand: Tile[],
  doraTiles: Tile[]
): GameState {
  const [leftWind, acrossWind, rightWind] = getOpponentWinds(data.seatWind);
  const roundWind = roundWindFromId(data.roundId);
  const startingActor: WindValue = 'east';
  const isDealer = data.seatWind === 'east';

  return {
    player: {
      seatWind: data.seatWind,
      hand,
      discards: [],
      melds: [],
      isDealer,
      isRiichi: false,
    },
    opponents: [
      {
        position: 'left',
        seatWind: leftWind,
        discards: [],
        melds: [],
        isRiichi: false,
        tileCount: 13,
      },
      {
        position: 'across',
        seatWind: acrossWind,
        discards: [],
        melds: [],
        isRiichi: false,
        tileCount: 13,
      },
      {
        position: 'right',
        seatWind: rightWind,
        discards: [],
        melds: [],
        isRiichi: false,
        tileCount: 13,
      },
    ],
    config: {
      roundWind,
      roundId: data.roundId,
      doraIndicatorStr: data.doraIndicatorStr,
      doraTiles,
      redFivesEnabled: data.redFivesEnabled,
      openTanyaoEnabled: data.openTanyaoEnabled,
    },
    phase: isDealer ? 'MY_DISCARD' : phaseForActor(data.seatWind, startingActor),
    currentActor: startingActor,
    currentTurn: actorFromWind(data.seatWind, startingActor),
    drawnTile: null,
    lastOpponentDiscard: null,
    turnCount: 0,
  };
}

export function useGameState(initialState: GameState) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return {
    state,
    drawTile: (tile: Tile) => dispatch({ type: 'DRAW_TILE', tile }),
    discardTile: (tileId: string) => dispatch({ type: 'DISCARD_TILE', tileId }),
    riichi: (tileId: string) => dispatch({ type: 'RIICHI', tileId }),
    chi: (meldTiles: [Tile, Tile, Tile]) => dispatch({ type: 'CHI', meldTiles }),
    pon: (meldTiles: [Tile, Tile, Tile]) => dispatch({ type: 'PON', meldTiles }),
    kan: (meldTiles: Tile[]) => dispatch({ type: 'KAN', meldTiles }),
    ron: () => dispatch({ type: 'RON' }),
    tsumo: () => dispatch({ type: 'TSUMO' }),
    passCall: () => dispatch({ type: 'PASS_CALL' }),
    opponentDiscard: (position: OpponentPosition, tile: Tile) =>
      dispatch({ type: 'OPPONENT_DISCARD', position, tile }),
    opponentRiichi: (position: OpponentPosition) =>
      dispatch({ type: 'OPPONENT_RIICHI', position }),
    opponentMeld: (
      position: OpponentPosition,
      meldType: 'chi' | 'pon' | 'kan',
      tiles: Tile[]
    ) => dispatch({ type: 'OPPONENT_MELD', position, meldType, tiles }),
  };
}
