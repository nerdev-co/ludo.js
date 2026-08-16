import { describe, expect, it } from 'bun:test';
import { updateState, findPossibleActions, diceRollAction } from '../src/game.ts';
import { createState, createAction } from '../src/state.ts';
import { mergeDeep } from './helpers.ts';
import type { GameState } from '../src/types.ts';

function stateWith(patch: unknown): GameState {
  return mergeDeep(createState(2), patch);
}

describe('game module', () => {
  describe('findPossibleActions', () => {
    it('predicts the born action when a six is rolled', () => {
      const state = stateWith({
        actions: [{ type: 'dice roll', rolled: [6], playerId: 0 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(4);
      expect(actions[0]?.verbs).toEqual(['born', 'move']);
      expect(actions[0]?.moveToCoord).toEqual([7, 14]);
      expect(actions[0]?.tokenId).toBe(0);
      expect(actions[0]?.dice).toBe(0);
    });

    it('predicts the token move action when there are active tokens', () => {
      const state = stateWith({
        tokens: [{ active: true, coord: [7, 14] }],
        actions: [{ type: 'dice roll', rolled: [5], playerId: 0 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(1);
      expect(actions[0]?.verbs).toEqual(['move']);
      expect(actions[0]?.moveToCoord).toEqual([6, 9]);
      expect(actions[0]?.tokenId).toBe(0);
    });

    it('predicts the token kill move action when there is an enemy token at the moveToCoord', () => {
      const state = stateWith({
        tokens: [
          { active: true, coord: [7, 14] },
          {},
          {},
          {},
          { active: true, coord: [6, 9] },
        ],
        actions: [{ type: 'dice roll', rolled: [5], playerId: 0 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(1);
      expect(actions[0]?.verbs).toEqual(['kill', 'move']);
      expect(actions[0]?.moveToCoord).toEqual([6, 9]);
      expect(actions[0]?.tokenId).toBe(0);
      expect(actions[0]?.killedTokenId).toBe(4);
    });

    it('predicts the token ascend move action when there are active tokens', () => {
      const state = stateWith({
        tokens: [{ active: true, coord: [8, 15] }],
        actions: [{ type: 'dice roll', rolled: [6], playerId: 0 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions[0]?.verbs).toEqual(['ascend', 'move']);
      expect(actions[0]?.moveToCoord).toEqual([8, 9]);
      expect(actions[0]?.tokenId).toBe(0);
    });

    it('does not return an action for a token that is blocked', () => {
      const state = stateWith({
        playerTurn: 1,
        tokens: [
          { active: true, coord: [8, 15] },
          { active: true, coord: [8, 15] },
          {},
          {},
          { active: true, coord: [9, 13] },
        ],
        actions: [{ type: 'dice roll', rolled: [1, 4], playerId: 1 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(1);
      expect(actions[0]?.verbs).toEqual(['move']);
      expect(actions[0]?.moveToCoord).toEqual([9, 14]);
      expect(actions[0]?.tokenId).toBe(4);

      expect(findPossibleActions(state, 1)).toHaveLength(0);
    });

    it('does not return an action for a token on the heavenPath if the roll is too much to ascend', () => {
      const state = stateWith({
        tokens: [{ active: true, coord: [8, 10] }],
        actions: [{ type: 'dice roll', rolled: [1, 2], playerId: 0 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(1);
      expect(actions[0]?.verbs).toEqual(['ascend', 'move']);
      expect(findPossibleActions(state, 1)).toHaveLength(0);
    });

    it('predicts when another action is possible for a dice', () => {
      const state = stateWith({
        actions: [{ type: 'dice roll', rolled: [6, 1], playerId: 0 }],
        nextActionType: 'token action',
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(4);
      expect(actions[0]?.verbs).toEqual(['born', 'move']);
      expect(actions[0]?.dice).toBe(0);
      expect(findPossibleActions(state, 1)).toHaveLength(0);
    });

    it('blocks ascending until the player has killed an enemy token', () => {
      const state = stateWith({
        tokens: [{ active: true, coord: [8, 15] }],
        actions: [{ type: 'dice roll', rolled: [6], playerId: 0 }],
        nextActionType: 'token action',
        requireKillToAscend: true,
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(3);
      expect(actions.some((action) => action.tokenId === 0)).toBe(false);
    });

    it('allows ascending once the player has killed an enemy token', () => {
      const state = stateWith({
        tokens: [{ active: true, coord: [8, 15] }],
        actions: [{ type: 'dice roll', rolled: [6], playerId: 0 }],
        nextActionType: 'token action',
        requireKillToAscend: true,
        kills: [1, 0],
      });

      const actions = findPossibleActions(state, 0);

      expect(actions.find((action) => action.tokenId === 0)?.verbs).toEqual([
        'ascend',
        'move',
      ]);
    });

    it('still allows heaven moves that do not finish the ascent', () => {
      const state = stateWith({
        tokens: [{ active: true, coord: [8, 12] }],
        actions: [{ type: 'dice roll', rolled: [2], playerId: 0 }],
        nextActionType: 'token action',
        requireKillToAscend: true,
      });

      const actions = findPossibleActions(state, 0);

      expect(actions).toHaveLength(1);
      expect(actions[0]?.verbs).toEqual(['move']);
      expect(actions[0]?.moveToCoord).toEqual([8, 10]);
    });
  });

  describe('updateState', () => {
    it('returns the state with the turn changed when the dice roll action has no possible token actions', () => {
      const action = createAction({ type: 'dice roll', rolled: [1, 2], playerId: 0 });
      const state = updateState(createState(2), action);

      expect(state.playerTurn).toBe(1);
      expect(state.nextActionType).toBe('dice roll');

      const action2 = createAction({ type: 'dice roll', rolled: [1, 2], playerId: 1 });
      const state2 = updateState(state, action2);

      expect(state2.playerTurn).toBe(0);
      expect(state2.nextActionType).toBe('dice roll');
    });

    it('returns the state with the turn not changed when there are possible actions', () => {
      const state = stateWith({ tokens: [{ active: true, coord: [7, 14] }] });

      const action = createAction({ type: 'dice roll', rolled: [5], playerId: 0 });
      const updated = updateState(state, action);

      expect(updated.playerTurn).toBe(0);
      expect(updated.nextActionType).toBe('token action');
    });

    it('returns the state updated with a token born action', () => {
      const state = stateWith({
        nextActionType: 'token action',
        actions: [{ type: 'dice roll', rolled: [6], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['born', 'move'],
        moveToCoord: [7, 14],
        tokenId: 0,
        dice: 0,
      });

      const updated = updateState(state, action);

      expect(updated.tokens[0]?.active).toBe(true);
      expect(updated.tokens[0]?.coord).toEqual([7, 14]);
      expect(updated.playerTurn).toBe(0);
      expect(updated.nextActionType).toBe('dice roll');
    });

    it('returns the state updated with a token move action', () => {
      const state = stateWith({
        nextActionType: 'token action',
        tokens: [{ active: true, coord: [7, 14] }],
        actions: [{ type: 'dice roll', rolled: [5], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['move'],
        moveToCoord: [6, 9],
        tokenId: 0,
        dice: 0,
      });

      const updated = updateState(state, action);

      expect(updated.tokens[0]?.coord).toEqual([6, 9]);
      expect(updated.nextActionType).toBe('dice roll');
      expect(updated.playerTurn).toBe(1);
    });

    it('returns the state updated with a token kill move action', () => {
      const state = stateWith({
        nextActionType: 'token action',
        tokens: [
          { active: true, coord: [7, 14] },
          {},
          {},
          {},
          { active: true, coord: [6, 9] },
        ],
        actions: [{ type: 'dice roll', rolled: [5], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['kill', 'move'],
        moveToCoord: [6, 9],
        tokenId: 0,
        killedTokenId: 4,
        dice: 0,
      });

      const updated = updateState(state, action);

      expect(updated.tokens[0]?.coord).toEqual([6, 9]);
      expect(updated.tokens[4]?.coord).toEqual([0, 0]);
      expect(updated.tokens[4]?.active).toBe(false);
      expect(updated.playerTurn).toBe(1);
      expect(updated.nextActionType).toBe('dice roll');
    });

    it('counts a kill for the player who performed it', () => {
      const state = stateWith({
        nextActionType: 'token action',
        tokens: [
          { active: true, coord: [7, 14] },
          {},
          {},
          {},
          { active: true, coord: [6, 9] },
        ],
        actions: [{ type: 'dice roll', rolled: [5], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['kill', 'move'],
        moveToCoord: [6, 9],
        tokenId: 0,
        killedTokenId: 4,
        dice: 0,
      });

      const updated = updateState(state, action);

      expect(updated.kills).toEqual([1, 0]);
    });

    it('returns the state updated with an ascend action', () => {
      const state = stateWith({
        nextActionType: 'token action',
        tokens: [{ active: true, coord: [8, 15] }],
        actions: [{ type: 'dice roll', rolled: [6], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['ascend', 'move'],
        moveToCoord: [8, 9],
        tokenId: 0,
        dice: 0,
      });

      const updated = updateState(state, action);

      expect(updated.tokens[0]?.coord).toEqual([8, 9]);
      expect(updated.tokens[0]?.active).toBe(false);
      expect(updated.tokens[0]?.ascend).toBe(true);
      expect(updated.playerTurn).toBe(0);
      expect(updated.nextActionType).toBe('dice roll');
    });

    it('returns the state updated with the game won', () => {
      const state = stateWith({
        nextActionType: 'token action',
        tokens: [
          { active: false, ascend: true, coord: [8, 9] },
          { active: false, ascend: true, coord: [8, 9] },
          { active: false, ascend: true, coord: [8, 9] },
          { active: true, ascend: false, coord: [8, 10] },
        ],
        actions: [{ type: 'dice roll', rolled: [1], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['ascend', 'move'],
        moveToCoord: [8, 9],
        tokenId: 3,
        dice: 0,
      });

      const updated = updateState(state, action);

      expect(updated.tokens[3]?.coord).toEqual([8, 9]);
      expect(updated.tokens[3]?.active).toBe(false);
      expect(updated.tokens[3]?.ascend).toBe(true);
      expect(updated.winner).toBe(0);
    });

    it('gives another dice roll if rolled is 6 and there are no more possible actions', () => {
      const state = stateWith({
        playerTurn: 1,
        tokens: [
          { active: true, coord: [8, 15] },
          { active: true, coord: [8, 15] },
          {},
          {},
          { active: true, coord: [9, 14] },
          { ascend: true, coord: [9, 8] },
          { ascend: true, coord: [9, 8] },
          { ascend: true, coord: [9, 8] },
        ],
      });

      const action = createAction({ type: 'dice roll', rolled: [2, 6], playerId: 1 });
      const updated = updateState(state, action);

      expect(updated.playerTurn).toBe(1);
      expect(updated.nextActionType).toBe('dice roll');
    });

    it('rejects actions of the wrong type', () => {
      const state = createState(2);
      const tokenAction = createAction({
        type: 'token action',
        verbs: ['move'],
        moveToCoord: [6, 9],
        tokenId: 0,
        dice: 0,
      });

      expect(() => updateState(state, tokenAction)).toThrow('Unexpected action type');
    });

    it('rejects impossible token actions', () => {
      const state = stateWith({
        nextActionType: 'token action',
        tokens: [{ active: true, coord: [7, 14] }],
        actions: [{ type: 'dice roll', rolled: [5], playerId: 0 }],
      });

      const action = createAction({
        type: 'token action',
        verbs: ['move'],
        moveToCoord: [9, 2],
        tokenId: 0,
        dice: 0,
      });

      expect(() => updateState(state, action)).toThrow('Impossible action provided');
    });
  });

  describe('diceRollAction', () => {
    it('returns a function that generates a dice roll action', () => {
      const roll = diceRollAction(2);

      expect(roll([1, 6])).toEqual(createAction({ type: 'dice roll', rolled: [1, 6], playerId: 2 }));
      expect(roll([2])).toEqual(createAction({ type: 'dice roll', rolled: [2], playerId: 2 }));
    });
  });
});