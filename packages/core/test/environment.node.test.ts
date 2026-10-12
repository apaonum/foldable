import { describe, expect, test } from 'vitest';
import { approximateLayoutMargins } from '../src/sources/environment';

describe('layout margin approximation', () => {
  test('left/right get the 20 px system minimum where the safe area is smaller', () => {
    expect(approximateLayoutMargins({ top: 0, right: 84, bottom: 34, left: 0 })).toEqual({
      top: 0,
      right: 84,
      bottom: 34,
      left: 20,
    });
  });

  test('top/bottom follow the safe area, even below 20 px', () => {
    expect(approximateLayoutMargins({ top: 82, right: 0, bottom: 0, left: 0 })).toEqual({
      top: 82,
      right: 20,
      bottom: 0,
      left: 20,
    });
  });

  test('a safe area of exactly 20 px is kept', () => {
    expect(approximateLayoutMargins({ top: 0, right: 20, bottom: 0, left: 20.5 })).toEqual({
      top: 0,
      right: 20,
      bottom: 0,
      left: 20.5,
    });
  });
});
