import { TEAMS, DICE_ROLL, TOKEN_ACTION } from './constants.ts';

export type Team = (typeof TEAMS)[number];
export type Coord = readonly [number, number];
export type ActionType = typeof DICE_ROLL | typeof TOKEN_ACTION;
export type Verb = 'born' | 'kill' | 'ascend' | 'move';

export interface Player {
  readonly id: number;
  readonly team: Team;
}

export interface Token {
  readonly id: number;
  readonly team: Team;
  readonly coord: Coord;
  readonly active: boolean;
  readonly ascend: boolean;
}

export interface DiceRollAction {
  readonly type: typeof DICE_ROLL;
  readonly rolled: readonly number[];
  readonly playerId: number;
}

export interface TokenAction {
  readonly type: typeof TOKEN_ACTION;
  readonly tokenId: number;
  readonly verbs: readonly Verb[];
  readonly dice: number;
  readonly killedTokenId?: number;
  readonly moveToCoord?: Coord;
}

export type Action = DiceRollAction | TokenAction;

export interface GameState {
  readonly players: readonly Player[];
  readonly tokens: readonly Token[];
  readonly nextActionType: ActionType;
  readonly actions: readonly Action[];
  readonly playerTurn: number;
  readonly winner?: number;
}