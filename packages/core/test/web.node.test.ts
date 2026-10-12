import { describe, expect, test } from 'vitest';
import { STALE, webFold } from '../src/sources/web';
import { bridgeFixtures, webFixtures } from './fixtures';

describe('segments → Fold', () => {
  test.each(webFixtures.map((f) => [f.name, f] as const))('%s', (_, f) => {
    const expected = 'stale' in f.expected ? STALE : f.expected.fold;
    expect(webFold(f.segments, f.viewport)).toEqual(expected);
  });
});

describe('the web Fold equals the Bridge Fold for the same geometry', () => {
  const paired = webFixtures.flatMap((f) => (f.bridge === undefined ? [] : [[f.name, f] as const]));

  test('every Bridge Posture fixture has a web twin', () => {
    expect(paired.map(([name]) => name)).toEqual(['book-regular', 'tabletop']);
  });

  test.each(paired)('%s', (_, f) => {
    const twin = bridgeFixtures.find((b) => b.name === f.bridge);
    expect(twin?.viewport).toEqual(f.viewport);
    expect(webFold(f.segments, f.viewport)).toEqual(twin?.snapshot.fold);
  });
});
