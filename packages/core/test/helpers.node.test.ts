import { describe, expect, test } from 'vitest';
import { arrangement } from '../src/index';

describe('arrangement()', () => {
  test('split with no axes gives only the style', () => {
    expect(arrangement({ style: 'split' })).toEqual({ 'data-foldable-arrangement': 'split' });
  });

  test.each(['horizontal', 'vertical'] as const)('split restricted to %s sets axes', (axes) => {
    expect(arrangement({ style: 'split', axes })).toEqual({
      'data-foldable-arrangement': 'split',
      'data-foldable-axes': axes,
    });
  });
});
