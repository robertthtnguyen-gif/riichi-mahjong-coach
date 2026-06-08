// lib/types.ts

export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon';
export type WindValue = 'east' | 'south' | 'west' | 'north';
export type DragonValue = 'red' | 'green' | 'white';

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
  doraIndicatorStr: string;
  doraTiles: Tile[];
  redFivesEnabled: boolean;
  openTanyaoEnabled: boolean;
}

export type GamePhase = 'draw' | 'discard';

export interface GameState {
  player: Player;
  opponents: Opponent[];
  config: GameConfig;
  phase: GamePhase;
  drawnTile: Tile | null;
  turnCount: number;
}

export interface StartGameData {
  seatWind: WindValue;
  roundWind: WindValue;
  isDealer: boolean;
  doraIndicatorStr: string;
  redFivesEnabled: boolean;
  openTanyaoEnabled: boolean;
  startingHandStr: string;
}
