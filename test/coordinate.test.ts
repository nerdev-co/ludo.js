import { describe, expect, it } from 'bun:test';
import { nextCoordsFrom } from '../src/coordinate.ts';
import type { Coord } from '../src/types.ts';

describe('coordinate module', () => {
  const path: readonly Coord[] = [
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
    [1, 6],
  ];
  const switchCoord: Coord = [1, 2];
  const alternate: readonly Coord[] = [
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
  ];

  it('returns a list of upcoming coords from the current coord', () => {
    const coords = nextCoordsFrom({ path, alternate, switchCoord, fromCoord: [1, 3], next: 2 });
    expect(coords).toEqual([
      [1, 4],
      [1, 5],
    ]);
  });

  it('returns a list of upcoming coords and loops around when the list finishes', () => {
    const coords = nextCoordsFrom({ path, alternate, switchCoord, fromCoord: [1, 5], next: 3 });
    expect(coords).toEqual([
      [1, 6],
      [1, 1],
      [1, 2],
    ]);
  });

  it('switches over to the alternate path when it hits the switchCoord', () => {
    const coords = nextCoordsFrom({ path, alternate, switchCoord, fromCoord: [1, 1], next: 3 });
    expect(coords).toEqual([
      [1, 2],
      [2, 1],
      [2, 2],
    ]);
  });

  it('switches over to the alternate path when on the switchCoord', () => {
    const coords = nextCoordsFrom({ path, alternate, switchCoord, fromCoord: [1, 2], next: 3 });
    expect(coords).toEqual([
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
  });

  it('stays on the alternate path if already on it', () => {
    const coords = nextCoordsFrom({ path, alternate, switchCoord, fromCoord: [2, 1], next: 2 });
    expect(coords).toEqual([
      [2, 2],
      [2, 3],
    ]);
  });

  it('returns a list with undefined when moving beyond the alternate coords', () => {
    const coords = nextCoordsFrom({ path, alternate, switchCoord, fromCoord: [2, 3], next: 3 });
    expect(coords).toEqual([
      [2, 4],
      undefined,
      undefined,
    ]);
  });
});