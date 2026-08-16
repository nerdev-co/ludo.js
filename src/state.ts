import type { Team, GameState, Player, Token, Action } from './types.ts';
import { DICE_ROLL } from './constants.ts';
import { TEAMS } from './constants.ts';

export function createState(playerCount: number, requireKillToAscend = false): GameState {
  if (playerCount <= 0 || playerCount >= 5) {
    throw new Error('Cannot create game with the player count specified');
  }

  const players: Player[] = TEAMS.slice(0, playerCount).map((team, id) => ({ id, team }));

  const tokens: Token[] = [];
  for (const team of TEAMS.slice(0, playerCount)) {
    for (let i = 0; i < 4; i++) {
      tokens.push({
        id: tokens.length,
        team,
        coord: [0, 0],
        active: false,
        ascend: false,
      });
    }
  }

  return {
    players,
    tokens,
    nextActionType: DICE_ROLL,
    actions: [],
    playerTurn: 0,
    kills: players.map(() => 0),
    requireKillToAscend,
  };
}

export function createAction<T extends Action>(spec: T): T {
  return spec;
}