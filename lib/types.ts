// lib/types.ts

export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon';
export type WindValue = 'east' | 'south' | 'west' | 'north';
export type DragonValue = 'red' | 'green' | 'white';
export type RoundId =
  | 'east-1'
  | 'east-2'
  | 'east-3'
  | 'east-4'
  | 'south-1'
  | 'south-2'
  | 'south-3'
  | 'south-4';

export interface Tile {
  suit: Suit;
  value: number | WindValue | DragonValue;
  isRed: boolean;
  id: string;
}

export type MeldType = 'chi' | 'pon' | 'kan' | 'closed-kan';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
}

export type OpponentPosition = 'left' | 'across' | 'right';

export interface Opponent {
  position: OpponentPosition;
  seatWind: WindValue;
  discards: Tile[];
  melds: Meld[];
  isRiichi: boolean;
  tileCount: number;
}

export interface OpponentDiscardEvent {
  position: OpponentPosition;
  tile: Tile;
  actor: WindValue;
}

export interface Player {
  seatWind: WindValue;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  isDealer: boolean;
  isRiichi: boolean;
}

export interface GameConfig {
  roundWind: WindValue;
  roundId: RoundId;
  doraIndicatorStr: string;
  doraTiles: Tile[];
  redFivesEnabled: boolean;
  openTanyaoEnabled: boolean;
}

export type GamePhase =
  | 'OPPONENT_TURN'
  | 'OPPONENT_DISCARDED'
  | 'CALL_DECISION'
  | 'MY_DRAW'
  | 'MY_DISCARD'
  | 'HAND_END';

export type TableActor = 'self' | OpponentPosition;

export interface GameState {
  player: Player;
  opponents: Opponent[];
  config: GameConfig;
  phase: GamePhase;
  currentActor: WindValue;
  currentTurn: TableActor;
  drawnTile: Tile | null;
  lastOpponentDiscard: OpponentDiscardEvent | null;
  turnCount: number;
}

export interface StartGameData {
  seatWind: WindValue;
  roundId: RoundId;
  doraIndicatorStr: string;
  redFivesEnabled: boolean;
  openTanyaoEnabled: boolean;
  startingHandStr: string;
}
