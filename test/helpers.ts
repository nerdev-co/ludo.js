import type { GameState } from '../src/types.ts';

function mergeValue(target: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== 'object') {
    return patch;
  }

  if (Array.isArray(patch)) {
    const merged = Array.isArray(target) ? [...target] : [];

    for (let i = 0; i < patch.length; i++) {
      merged[i] = mergeValue(merged[i], patch[i]);
    }

    return merged;
  }

  const merged: Record<string, unknown> = {
    ...(target !== null && typeof target === 'object' && !Array.isArray(target)
      ? (target as Record<string, unknown>)
      : {}),
  };

  for (const [key, value] of Object.entries(patch)) {
    merged[key] = mergeValue(merged[key], value);
  }

  return merged;
}

export function mergeDeep(state: GameState, patch: unknown): GameState {
  return mergeValue(state, patch) as GameState;
}