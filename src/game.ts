import { DICE_ROLL, TOKEN_ACTION } from './constants.ts';
import { createAction } from './state.ts';
import { startPoint, path, switchCoords, heaven } from './grid.ts';
import { nextCoordsFrom } from './coordinate.ts';
import { coordEquals, deepEqual, groupBy, setIn } from './utils.ts';
import type {
  Action,
  Coord,
  DiceRollAction,
  GameState,
  Team,
  Token,
  TokenAction,
  Verb,
} from './types.ts';

export function diceRollAction(playerTurn: number) {
  return (die: readonly number[]): DiceRollAction =>
    createAction({ type: DICE_ROLL, rolled: die, playerId: playerTurn });
}

function nextPlayer(count: number, playerId: number): number {
  return playerId + 1 === count ? 0 : playerId + 1;
}

function lastDiceAction(
  actions: readonly Action[],
  playerId: number
): DiceRollAction | undefined {
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];

    if (action?.type === DICE_ROLL && action.playerId === playerId) {
      return action;
    }
  }

  return undefined;
}

function isAlreadyUsed(
  dice: number,
  diceAction: DiceRollAction,
  actions: readonly Action[]
): boolean {
  const last = actions[actions.length - 1];

  if (last !== undefined && deepEqual(last, diceAction)) {
    return false;
  }

  const reverseActions = [...actions].reverse();
  const diceActionIndex = reverseActions.findIndex((action) => deepEqual(action, diceAction));

  return reverseActions
    .slice(0, diceActionIndex)
    .some((action) => action?.type === TOKEN_ACTION && action.dice === dice);
}

function findEnemyTokenAtCoord(
  tokens: readonly Token[],
  team: Team,
  coord: Coord
): Token | undefined {
  return tokens.find((token) => token.team !== team && coordEquals(token.coord, coord));
}

function isMultipleTokensAt(
  tokens: readonly Token[],
  coords: (Coord | undefined)[]
): boolean {
  return tokens.some(
    (token, i) =>
      tokens
        .slice(0, i)
        .some((prev) => coordEquals(prev.coord, token.coord)) &&
      coords.some((coord) => coord !== undefined && coordEquals(coord, token.coord))
  );
}

function isPathBlockedFor(
  token: Token,
  tokens: readonly Token[],
  coords: (Coord | undefined)[]
): boolean {
  const enemyTeams = new Set(
    tokens.filter((t) => t.team !== token.team).map((t) => t.team)
  );

  for (const team of enemyTeams) {
    if (isMultipleTokensAt(tokens.filter((t) => t.team === team), coords)) {
      return true;
    }
  }

  return false;
}

interface PossibleActionInput {
  readonly token: Token;
  readonly dice: number;
  readonly diceAction: DiceRollAction;
  readonly state: GameState;
}

function possibleActionFor({
  token,
  dice,
  diceAction,
  state,
}: PossibleActionInput): TokenAction | undefined {
  const rolled = diceAction.rolled[dice];
  const canBorn = token.active === false && rolled === 6;
  const heavenPath = heaven[token.team];
  const tokens = state.tokens;

  if (rolled === undefined || (!canBorn && token.active !== true) || token.ascend === true) {
    return undefined;
  }

  let coords: (Coord | undefined)[] | undefined;
  const verbs: Verb[] = [];

  if (canBorn) {
    verbs.push('born');
    coords = [startPoint[token.team]];
  }

  if (token.active === true) {
    coords = nextCoordsFrom({
      path,
      alternate: heavenPath,
      switchCoord: switchCoords[token.team],
      next: rolled,
      fromCoord: token.coord,
    });
  }

  if (
    coords === undefined ||
    coords.includes(undefined) ||
    isPathBlockedFor(token, tokens, coords)
  ) {
    return undefined;
  }

  const moveToCoord = coords[coords.length - 1];
  if (moveToCoord === undefined) {
    return undefined;
  }

  const enemyToken = findEnemyTokenAtCoord(tokens, token.team, moveToCoord);

  const heavenEnd = heavenPath[heavenPath.length - 1];
  const mayAscend =
    state.requireKillToAscend === false ||
    (state.kills[state.playerTurn] ?? 0) > 0;

  if (heavenEnd !== undefined && coordEquals(heavenEnd, moveToCoord)) {
    if (!mayAscend) {
      return undefined;
    }

    verbs.push('ascend');
  }

  if (enemyToken !== undefined) {
    verbs.push('kill');
  }

  return createAction({
    type: TOKEN_ACTION,
    tokenId: token.id,
    verbs: [...verbs, 'move'],
    dice,
    ...(enemyToken !== undefined ? { killedTokenId: enemyToken.id } : {}),
    moveToCoord,
  });
}

export function findPossibleActions(
  state: GameState,
  dice: number
): readonly TokenAction[] {
  const player = state.players[state.playerTurn];

  if (player === undefined) {
    return [];
  }

  const diceAction = lastDiceAction(state.actions, state.playerTurn);

  if (diceAction === undefined) {
    return [];
  }

  return state.tokens
    .filter((token) => token.team === player.team)
    .map((token) => possibleActionFor({ token, dice, diceAction, state }))
    .filter((action): action is TokenAction => action !== undefined);
}

function anyPossibleActions(diceAction: DiceRollAction, state: GameState): boolean {
  return diceAction.rolled
    .map((_, key) => key)
    .filter((key) => !isAlreadyUsed(key, diceAction, state.actions))
    .some((key) => findPossibleActions(state, key).length > 0);
}

function changeTurnAndAction(state: GameState): GameState {
  const diceAction = lastDiceAction(state.actions, state.playerTurn);

  if (diceAction === undefined) {
    return { ...state, nextActionType: DICE_ROLL };
  }

  if (anyPossibleActions(diceAction, state)) {
    return { ...state, nextActionType: TOKEN_ACTION };
  }

  const rolledAnySixes = diceAction.rolled.some((dice) => dice === 6);

  if (rolledAnySixes) {
    return { ...state, nextActionType: DICE_ROLL };
  }

  return {
    ...state,
    playerTurn: nextPlayer(state.players.length, state.playerTurn),
    nextActionType: DICE_ROLL,
  };
}

const actionPerformers: Record<
  Verb,
  (action: TokenAction, state: GameState) => GameState
> = {
  born(action, state) {
    return setIn(state, ['tokens', action.tokenId, 'active'], true);
  },
  kill(action, state) {
    if (action.killedTokenId === undefined) {
      return state;
    }

    const kills = [...state.kills];
    kills[state.playerTurn] = (kills[state.playerTurn] ?? 0) + 1;

    return {
      ...setIn(
        setIn(state, ['tokens', action.killedTokenId, 'active'], false),
        ['tokens', action.killedTokenId, 'coord'],
        [0, 0]
      ),
      kills,
    };
  },
  ascend(action, state) {
    return setIn(
      setIn(state, ['tokens', action.tokenId, 'active'], false),
      ['tokens', action.tokenId, 'ascend'],
      true
    );
  },
  move(action, state) {
    if (action.moveToCoord === undefined) {
      return state;
    }

    return setIn(state, ['tokens', action.tokenId, 'coord'], action.moveToCoord);
  },
};

function performAction(action: Action, state: GameState): GameState {
  if (action.type !== TOKEN_ACTION) {
    return state;
  }

  return action.verbs.reduce(
    (prevState, verb) => actionPerformers[verb](action, prevState),
    state
  );
}

function appendAction(action: Action, state: GameState): GameState {
  return { ...state, actions: [...state.actions, action] };
}

function checkForWinner(state: GameState): GameState {
  for (const teamTokens of Object.values(groupBy(state.tokens, (token) => token.team))) {
    if (!teamTokens.every((token) => token.ascend)) {
      continue;
    }

    const champion = teamTokens[0];

    if (champion === undefined) {
      continue;
    }

    const winner = state.players.find((player) => player.team === champion.team);

    if (winner !== undefined) {
      return { ...state, winner: winner.id };
    }
  }

  return state;
}

function validateAction(action: Action, state: GameState): GameState {
  if (action.type !== state.nextActionType) {
    throw new Error('Unexpected action type');
  }

  if (action.type === TOKEN_ACTION) {
    const possibleActions = findPossibleActions(state, action.dice);

    if (!possibleActions.some((possible) => deepEqual(possible, action))) {
      throw new Error('Impossible action provided');
    }
  }

  return state;
}

export function updateState(state: GameState, action: Action): GameState {
  return checkForWinner(
    changeTurnAndAction(
      appendAction(action, performAction(action, validateAction(action, state)))
    )
  );
}