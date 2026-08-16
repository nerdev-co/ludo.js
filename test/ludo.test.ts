import { describe, expect, it } from 'bun:test';
import { createGame, rollDie } from '../src/index.ts';
import type { Action } from '../src/types.ts';

describe('ludo game', () => {
  it('returns a dice roll action for the first action type', () => {
    const game = createGame({ playerCount: 2 });

    expect(game.nextActionType()).toBe('dice roll');

    const action = game.rollDice([1, 2]);
    const newGame = game.update(action);

    const actions = newGame.getState().actions;
    expect(actions[actions.length - 1]).toEqual(action);
    expect(actions).toHaveLength(1);
  });

  it('freezes the game facade', () => {
    const game = createGame({ playerCount: 2 });
    expect(Object.isFrozen(game)).toBe(true);
  });

  it('rollDie returns a die between 1 and the number of sides', () => {
    for (let i = 0; i < 100; i++) {
      const die = rollDie(6);
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
    }
  });

  it('plays an entire game and stops when there is a winner', () => {
    let game = createGame({ playerCount: 4 });
    let winner = false;

    while (!winner) {
      let action: Action;

      if (game.nextActionType() === 'dice roll') {
        action = game.rollDice([rollDie()]);
      } else {
        const actions = game.getPossibleActions(0);
        action = actions[Math.floor(Math.random() * actions.length)]!;
      }

      game = game.update(action);

      if (game.getState().winner !== undefined) {
        winner = true;
      }
    }
  });
});