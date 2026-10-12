import { describe, expect, test } from 'vitest';
import { isSupportedVersion, parseSnapshot } from '../src/sources/bridge';
import type { Insets } from '../src/types';
import { bridgeFixtures, skewFixtures } from './fixtures';

const PROBE: Insets = { top: 0, right: 84, bottom: 34, left: 0 };
// What the 520 px rule says for the page; a Bridge never sends `regular` for an unknown value.
const env = { safeArea: () => PROBE, sizeClass: () => 'regular' as const };

const VALID = {
  fold: { x: 455.5, y: 0, width: 40, height: 669 },
  sizeClass: 'regular',
  safeArea: { top: 0, right: 84, bottom: 34, left: 0 },
  layoutMargins: { top: 0, right: 84, bottom: 34, left: 20 },
} as const;

describe('parseSnapshot', () => {
  test.each(bridgeFixtures.map((f) => [f.name, f] as const))(
    'a valid v1 snapshot (%s) passes through',
    (_, f) => {
      expect(parseSnapshot(f.snapshot, env)).toEqual(f.snapshot);
    },
  );

  test('unknown fields are dropped', () => {
    expect(parseSnapshot({ ...VALID, hinge: 2, extra: { a: 1 } }, env)).toEqual(VALID);
  });

  test('a sent posture is ignored', () => {
    expect(parseSnapshot({ ...VALID, posture: 'tabletop' }, env)).toEqual(VALID);
  });

  test.each([['large'], [''], [2], [null]])('unknown sizeClass %j becomes compact', (sizeClass) => {
    expect(parseSnapshot({ ...VALID, sizeClass }, env)).toEqual({
      ...VALID,
      sizeClass: 'compact',
    });
  });

  test('a missing sizeClass comes from the 520 px rule', () => {
    const { sizeClass: _, ...sent } = VALID;
    expect(parseSnapshot(sent, { ...env, sizeClass: () => 'compact' })).toEqual({
      ...VALID,
      sizeClass: 'compact',
    });
    expect(parseSnapshot(sent, env)).toEqual({ ...VALID, sizeClass: 'regular' });
  });

  test.each([
    ['missing', undefined],
    ['a string', '455.5,0,40,669'],
    ['an array', [455.5, 0, 40, 669]],
    ['missing height', { x: 455.5, y: 0, width: 40 }],
    ['a string member', { x: '455.5', y: 0, width: 40, height: 669 }],
    ['a NaN member', { x: Number.NaN, y: 0, width: 40, height: 669 }],
    ['an infinite member', { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 669 }],
  ])('fold that is %s becomes null', (_, fold) => {
    expect(parseSnapshot({ ...VALID, fold }, env)).toEqual({ ...VALID, fold: null });
  });

  test('a fold with extra members keeps only the rect', () => {
    const fold = { x: 0, y: 455.5, width: 669, height: 40, isActive: true };
    expect(parseSnapshot({ ...VALID, fold }, env)).toEqual({
      ...VALID,
      fold: { x: 0, y: 455.5, width: 669, height: 40 },
    });
  });

  test.each([
    ['missing', undefined],
    ['null', null],
    ['missing left', { top: 0, right: 0, bottom: 34 }],
    ['a string member', { top: '0', right: 0, bottom: 34, left: 0 }],
  ])('safeArea that is %s comes from the env() probe', (_, safeArea) => {
    expect(parseSnapshot({ ...VALID, safeArea }, env)).toEqual({ ...VALID, safeArea: PROBE });
  });

  test('a missing safeArea with valid layoutMargins keeps the Bridge margins', () => {
    const layoutMargins = { top: 82, right: 20, bottom: 34, left: 20 };
    expect(parseSnapshot({ ...VALID, safeArea: undefined, layoutMargins }, env)).toEqual({
      ...VALID,
      safeArea: PROBE,
      layoutMargins,
    });
  });

  test.each([
    ['missing', undefined],
    ['a number', 20],
    ['missing top', { right: 84, bottom: 34, left: 20 }],
  ])('layoutMargins that is %s is approximated from the safe area', (_, layoutMargins) => {
    const safeArea = { top: 82, right: 0, bottom: 34, left: 0 };
    expect(parseSnapshot({ ...VALID, safeArea, layoutMargins }, env)).toEqual({
      ...VALID,
      safeArea,
      layoutMargins: { top: 82, right: 20, bottom: 34, left: 20 },
    });
  });

  test('missing safeArea and layoutMargins: probe, then approximate from the probe', () => {
    expect(parseSnapshot({ fold: null, sizeClass: 'compact' }, env)).toEqual({
      fold: null,
      sizeClass: 'compact',
      safeArea: PROBE,
      layoutMargins: { top: 0, right: 84, bottom: 34, left: 20 },
    });
  });

  test.each([
    ['null', null],
    ['a string', 'snapshot'],
    ['an array', []],
  ])('a snapshot that is %s gets every fallback value', (_, raw) => {
    expect(parseSnapshot(raw, env)).toEqual({
      fold: null,
      sizeClass: 'regular',
      safeArea: PROBE,
      layoutMargins: { top: 0, right: 84, bottom: 34, left: 20 },
    });
  });
});

describe('isSupportedVersion', () => {
  test('version 1 is supported', () => {
    expect(isSupportedVersion(1)).toBe(true);
  });

  test.each([[2], [0], [1.5], ['1'], [null], [undefined]])('version %j is not', (version) => {
    expect(isSupportedVersion(version)).toBe(false);
  });
});

describe.each(skewFixtures.map((f) => [f.name, f] as const))('skew fixture %s', (_, f) => {
  test('parses to the expected state, or is rejected by version', () => {
    const fixtureEnv = { safeArea: () => f.probe.safeArea, sizeClass: () => f.probe.sizeClass };
    if (f.expected.source === 'bridge') {
      expect(isSupportedVersion(f.version)).toBe(true);
      expect(parseSnapshot(f.sent, fixtureEnv)).toEqual(f.expected.state);
    } else {
      expect(isSupportedVersion(f.version)).toBe(false);
    }
  });
});
