import { describe, expect, it } from 'bun:test';
import { createState } from '../src/state.ts';

describe('state module', () => {
  const state = createState(2);

  it('has the same amount of players passed in', () => {
    expect(state.players).toHaveLength(2);
  });

  it('has 4 tokens for each player', () => {
    expect(state.tokens).toHaveLength(8);
  });

  it('assigns tokens sequential ids across all players', () => {
    expect(state.tokens.map((token) => token.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('the initial player turn is 0', () => {
    expect(state.playerTurn).toBe(0);
  });

  it('has winner set to undefined', () => {
    expect(state.winner).toBe(undefined);
  });

  it('starts with no actions and a dice roll pending', () => {
    expect(state.actions).toEqual([]);
    expect(state.nextActionType).toBe('dice roll');
  });

  it('rejects invalid player counts', () => {
    expect(() => createState(0)).toThrow('Cannot create game with the player count specified');
    expect(() => createState(5)).toThrow('Cannot create game with the player count specified');
  });
});