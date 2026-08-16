import type { Coord } from './types.ts';
import { coordEquals } from './utils.ts';

export interface NextCoordsFromOptions {
  readonly path: readonly Coord[];
  readonly alternate: readonly Coord[];
  readonly switchCoord: Coord;
  readonly fromCoord: Coord | undefined;
  readonly next: number;
}

export function nextCoordsFrom(
  { path, alternate, switchCoord, fromCoord, next }: NextCoordsFromOptions,
  list: (Coord | undefined)[] = []
): (Coord | undefined)[] {
  if (next === 0) {
    return list;
  }

  let p = path;
  let nextCoord: Coord | undefined;

  const onAlternate =
    fromCoord !== undefined &&
    (coordEquals(switchCoord, fromCoord) ||
      alternate.some((coord) => coordEquals(coord, fromCoord)));

  if (onAlternate) {
    p = alternate;
  }

  const alternateEnd = alternate[alternate.length - 1];

  if (fromCoord !== undefined && alternateEnd !== undefined && !coordEquals(fromCoord, alternateEnd)) {
    const pathEnd = p[p.length - 1];
    const atPathEnd = pathEnd !== undefined && coordEquals(fromCoord, pathEnd);
    const onPath = p.some((coord) => coordEquals(coord, fromCoord));

    if (atPathEnd || !onPath) {
      nextCoord = p[0];
    } else {
      nextCoord = p[p.findIndex((coord) => coordEquals(coord, fromCoord)) + 1];
    }
  }

  return nextCoordsFrom(
    { path: p, alternate, switchCoord, fromCoord: nextCoord, next: next - 1 },
    [...list, nextCoord]
  );
}