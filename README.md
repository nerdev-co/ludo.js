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

## Usage

```ts
import { createGame, rollDie } from './index.ts';

const game = createGame({ playerCount: 4 });

// On each turn, either roll the dice or pick a token action:
const action = game.nextActionType() === 'dice roll'
  ? game.rollDice([rollDie()])
  : game.getPossibleActions(0)[0];

const next = game.update(action);
const state = next.getState(); // { players, tokens, nextActionType, actions, playerTurn, winner? }
```

## Commands

```bash
bun install     # install dependencies
bun test        # run the test suite
bun run typecheck  # typecheck with tsc
```