import type { Coord } from './types.ts';

export function coordEquals(a: Coord, b: Coord): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  const aKeys = Object.keys(a) as (keyof typeof a)[];
  const bKeys = Object.keys(b) as (keyof typeof b)[];

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual(a[key], (b as Record<keyof typeof a, unknown>)[key])
  );
}

export function groupBy<T, K extends string | number>(
  items: readonly T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }

  return result;
}

export function setIn<T extends object>(
  obj: T,
  path: readonly (string | number)[],
  value: unknown
): T {
  if (path.length === 0) {
    return obj;
  }

  const key = path[0];
  const rest = path.slice(1);

  if (key === undefined) {
    return obj;
  }

  const next =
    rest.length === 0
      ? value
      : setIn(
          (obj as Record<string | number, unknown>)[key] as object,
          rest,
          value
        );

  if (Array.isArray(obj)) {
    const clone = [...obj];
    clone[key as number] = next as (typeof clone)[number];
    return clone as T;
  }

  return { ...obj, [key]: next } as T;
}