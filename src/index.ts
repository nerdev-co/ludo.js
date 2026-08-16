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

function normalizeState(state: GameState): GameState {
  const kills = state.players.map((_, i) => state.kills?.[i] ?? 0);
  const requireKillToAscend = state.requireKillToAscend ?? false;

  if (
    kills.every((killsCount, i) => state.kills?.[i] === killsCount) &&
    requireKillToAscend === state.requireKillToAscend
  ) {
    return state;
  }

  return { ...state, kills, requireKillToAscend };
}

export function continueGame(state: GameState): Game {
  const normalized = normalizeState(state);
  const rollDice = diceRollAction(normalized.playerTurn);
  const getPossibleActions = (dice: number): readonly TokenAction[] =>
    findPossibleActions(normalized, dice);
  const update = (action: Action): Game => continueGame(updateState(normalized, action));

  return Object.freeze({
    getState: () => normalized,
    nextActionType: () => normalized.nextActionType,
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