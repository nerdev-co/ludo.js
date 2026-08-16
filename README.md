# ludo.js

The ludo board game engine, ported to TypeScript for [Bun](https://bun.com).

A rebuild of [kenrick/ludo.js](https://github.com/kenrick/ludo.js) with zero runtime
dependencies and full type safety, keeping the same public API.

## Improvements over the original

- **No dependencies** — Immutable.js and lodash removed. Immutable, structural updates are
  done with plain (readonly) objects and arrays.
- **Fully typed** — strict TypeScript types for `GameState`, `Action`, `Token`, `Coord`, etc.
- **`bun test`** — the original Karma/Mocha suites are rewritten as fast Bun unit tests.
- **Same API** — drop-in compatible with the original library.
- **New helpers** — `rollDie()` for rolling, explicit validation errors for impossible actions.
- Fixed a potential infinite recursion when querying actions without a dice roll action.

## Installation

```bash
bun install
```

## Getting started

```ts
import { createGame, rollDie } from './index.ts';

let game = createGame({ playerCount: 4 });

// Game loop: alternate between rolling the dice and picking a token action.
while (game.getState().winner === undefined) {
  if (game.nextActionType() === 'dice roll') {
    // rollDice() takes the actual die value(s); supply 1..6 per die.
    game = game.update(game.rollDice([rollDie()]));
  } else {
    // getPossibleActions() returns the legal moves for this dice (index 0 = first die).
    const [action] = game.getPossibleActions(0);
    if (action) game = game.update(action);
  }
}

console.log(`Player ${game.getState().winner} wins!`);
```

## Game API

### `createGame({ playerCount, requireKillToAscend? })`

Creates a new game with 2–4 players (throws otherwise). Each player gets 4 tokens.
Players are ordered `'bl'`, `'br'`, `'tr'`, `'tl'` (bottom-left, bottom-right, top-right,
top-left); the first player to play is player `0`.

Set `requireKillToAscend: true` to enable the variant where a player must capture at least
one enemy token before their tokens may finish in the home column. The number of kills per
player is tracked in `state.kills`.

```ts
const game = createGame({ playerCount: 4 });
const houseRules = createGame({ playerCount: 4, requireKillToAscend: true });
```

### `game.getState(): GameState`

Returns the current immutable game state (see [GameState](#gamestate)).

### `game.nextActionType(): ActionType`

Tells you what to do next: `'dice roll'` or `'token action'`.

- `'dice roll'` — the current player must roll the dice.
- `'token action'` — the current player must move a token.

### `game.rollDice(die: readonly number[]): DiceRollAction`

Creates a dice roll action **for the current player** (the facade already knows whose turn
it is). Pass the actual die value(s): `game.rollDice([rollDie()])`. Rolled dice can be
consumed one at a time, so you may roll more than one die per turn if your rules allow it.

```ts
const action = game.rollDice([5]); // player rolled a 5
const next = game.update(action);
```

### `game.getPossibleActions(dice: number): readonly TokenAction[]`

Returns the legal token actions for the current player **for a given die**. `dice` is the
**0-based index** into the `rolled` array of the last dice roll, not the die value itself.
For a single die you always pass `0`.

```ts
const action = game.rollDice([5]);
game = game.update(action);

const legalMoves = game.getPossibleActions(0);
console.log(legalMoves); // e.g. [{ type: 'token action', tokenId: 0, verbs: ['move'], ... }]
```

Each die index may be used only once per roll; the engine accounts for that when deciding
whether your turn continues.

### `game.update(action: Action): Game`

Applies an action and returns a **new** game with the updated state. The original game is
left untouched (all state is immutable and the facade is frozen).

```ts
let game = createGame({ playerCount: 2 });
game = game.update(game.rollDice([6]));     // roll a 6
const [born] = game.getPossibleActions(0);  // born your token onto the board
game = game.update(born);
```

Throws on invalid input:

| Error | When |
| --- | --- |
| `Cannot create game with the player count specified` | `playerCount` outside 2–4 |
| `Unexpected action type` | action doesn't match `nextActionType()` |
| `Impossible action provided` | token action isn't among `getPossibleActions()` |

### `continueGame(state: GameState): Game`

Resumes a game from an existing `GameState` — useful for persistence, replay, or AI
evaluation. `update()` is built on it internally. States saved before `kills` and
`requireKillToAscend` existed are still accepted: the missing fields are backfilled
(`kills` = all zeros, rule disabled).

```ts
import { createGame, continueGame } from './index.ts';
import type { GameState } from './types.ts';

let state: GameState = createGame({ playerCount: 2 }).getState();
// ...persist `state` to disk / network...

const game = continueGame(state);
```

### `rollDie(sides = 6): number`

Utility for rolling a fair die: returns an integer in `[1, sides]` (default `6`).

```ts
game.rollDice([rollDie()]);
```

## GameState

```ts
interface GameState {
  readonly players: readonly Player[];     // [{ id: 0, team: 'bl' }, ...]
  readonly tokens: readonly Token[];       // 4 tokens per player, 16 total
  readonly nextActionType: ActionType;     // 'dice roll' | 'token action'
  readonly actions: readonly Action[];     // full move history
  readonly playerTurn: number;             // index into `players`
  readonly kills: readonly number[];       // enemy tokens captured, per player id
  readonly requireKillToAscend: boolean;   // whether ascent requires a kill first
  readonly winner?: number;                // player id, set once a team has all tokens in
}
```

### Token

```ts
interface Token {
  readonly id: number;
  readonly team: Team;        // 'bl' | 'br' | 'tr' | 'tl'
  readonly coord: Coord;      // [row, col] on the board grid
  readonly active: boolean;   // false while in the base yard or ascended
  readonly ascend: boolean;   // true once the token has reached the home column
}
```

### Actions

```ts
type Action = DiceRollAction | TokenAction;

interface DiceRollAction {
  readonly type: 'dice roll';
  readonly rolled: readonly number[];  // the die values, e.g. [5]
  readonly playerId: number;
}

interface TokenAction {
  readonly type: 'token action';
  readonly tokenId: number;        // which token to move
  readonly verbs: readonly Verb[]; // what happens, in order, e.g. ['kill', 'move']
  readonly dice: number;           // 0-based index of the die used
  readonly killedTokenId?: number; // set when verbs contains 'kill'
  readonly moveToCoord?: Coord;    // final square the token lands on
}
```

`Verb` is `'born' | 'kill' | 'ascend' | 'move'`. A token action lists its effects in
order — e.g. landing on an enemy token and capturing it is `['kill', 'move']`; reaching
the home column is `['ascend', 'move']`.

## Rules implemented

- A token must roll a **6** to leave the base yard (`'born'`).
- Rolling a **6** grants an extra roll.
- Landing on an enemy token captures it (`'kill'`); the captured token returns to the yard.
  The kill is recorded in `state.kills`.
- A token that reaches the home column is removed from the board (`'ascend'`). With
  `requireKillToAscend` enabled, the landing move is unavailable until the player has at
  least one kill; other moves along the home column still work.
- The first team to get **all 4 tokens** home wins; `winner` is then set in the state.
- A block (two or more tokens of the same team on a square) blocks enemy movement through it.
- If the roll's dice are all consumed or no moves are possible, play passes to the next player.

## Commands

```bash
bun install     # install dependencies
bun test        # run the test suite
bun run typecheck  # typecheck with tsc
```
