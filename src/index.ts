import { updateState, findPossibleActions, diceRollAction } from './game.ts';
import { createState } from './state.ts';
import type { Action, ActionType, DiceRollAction, GameState, TokenAction } from './types.ts';

export interface Game {
  getState(): GameState;
  nextActionType(): ActionType;
  rollDice(die: readonly number[]): DiceRollAction;
  getPossibleActions(dice: number): readonly TokenAction[];
  update(action: Action): Game;
}

export function continueGame(state: GameState): Game {
  const rollDice = diceRollAction(state.playerTurn);
  const getPossibleActions = (dice: number): readonly TokenAction[] =>
    findPossibleActions(state, dice);
  const update = (action: Action): Game => continueGame(updateState(state, action));

  return Object.freeze({
    getState: () => state,
    nextActionType: () => state.nextActionType,
    rollDice,
    getPossibleActions,
    update,
  });
}

export interface CreateGameOptions {
  readonly playerCount: number;
  readonly requireKillToAscend?: boolean;
}

export function createGame({
  playerCount,
  requireKillToAscend = false,
}: CreateGameOptions): Game {
  return continueGame(createState(playerCount, requireKillToAscend));
}

export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1;
}