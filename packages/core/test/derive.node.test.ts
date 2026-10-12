import { describe, expect, test } from 'vitest';
import { posture, regions } from '../src/derive';
import { bridgeFixtures } from './fixtures';

describe('Posture rule', () => {
  test('no Fold is none', () => {
    expect(posture(null)).toBe('none');
  });

  test('a Fold taller than wide is book', () => {
    expect(posture({ x: 455.5, y: 0, width: 40, height: 669 })).toBe('book');
  });

  test('a Fold wider than tall is tabletop', () => {
    expect(posture({ x: 0, y: 455.5, width: 669, height: 40 })).toBe('tabletop');
  });
});

describe('Region derivation', () => {
  test.each(bridgeFixtures.map((f) => [f.name, f] as const))('%s', (_, f) => {
    expect(regions(f.snapshot.fold, f.viewport)).toEqual(f.expected.regions);
  });

  test('a book Fold splits the viewport into left then right', () => {
    expect(
      regions({ x: 455.5, y: 0, width: 40, height: 669 }, { width: 951, height: 669 }),
    ).toEqual([
      { x: 0, y: 0, width: 455.5, height: 669 },
      { x: 495.5, y: 0, width: 455.5, height: 669 },
    ]);
  });

  test('a tabletop Fold splits the viewport into top then bottom', () => {
    expect(
      regions({ x: 0, y: 455.5, width: 669, height: 40 }, { width: 669, height: 951 }),
    ).toEqual([
      { x: 0, y: 0, width: 669, height: 455.5 },
      { x: 0, y: 495.5, width: 669, height: 455.5 },
    ]);
  });

  test('a Fold clipped to the window edge leaves one Region, not a zero-width one', () => {
    expect(
      regions({ x: 455.5, y: 0, width: 13.5, height: 669 }, { width: 469, height: 669 }),
    ).toEqual([{ x: 0, y: 0, width: 455.5, height: 669 }]);
  });

  test('no Fold gives one Region covering the viewport', () => {
    expect(regions(null, { width: 466, height: 678 })).toEqual([
      { x: 0, y: 0, width: 466, height: 678 },
    ]);
  });
});
