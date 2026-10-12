import { describe, expect, test } from 'vitest';
import { arrangement } from '../src/index';

describe('arrangement() for Overlay', () => {
  test('overlay with no options gives only the style', () => {
    expect(arrangement({ style: 'overlay' })).toEqual({ 'data-foldable-arrangement': 'overlay' });
  });

  test.each([
    [{ inline: 'leading' }, 'leading'],
    [{ inline: 'trailing' }, 'trailing'],
    [{ block: 'top' }, 'top'],
    [{ block: 'bottom' }, 'bottom'],
    [{ inline: 'leading', block: 'top' }, 'leading top'],
    [{ inline: 'trailing', block: 'bottom' }, 'trailing bottom'],
  ] as const)('overlayEdge %o is "%s"', (overlayEdge, tokens) => {
    expect(arrangement({ style: 'overlay', overlayEdge })).toEqual({
      'data-foldable-arrangement': 'overlay',
      'data-foldable-overlay-edge': tokens,
    });
  });

  test('an empty overlayEdge leaves both axes on their defaults', () => {
    expect(arrangement({ style: 'overlay', overlayEdge: {} })).toEqual({
      'data-foldable-arrangement': 'overlay',
    });
  });

  test.each(['collapsed', 'expanded'] as const)('overlayState %s', (overlayState) => {
    expect(arrangement({ style: 'overlay', overlayState })).toEqual({
      'data-foldable-arrangement': 'overlay',
      'data-foldable-overlay-state': overlayState,
    });
  });
});

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
