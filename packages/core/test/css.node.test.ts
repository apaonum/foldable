import { describe, expect, test } from 'vitest';
import { toCSS } from '../src/css';
import { SERVER_STATE } from '../src/server-state';
import type { State } from '../src/types';

describe('toCSS', () => {
  test('book state writes the Fold rect, insets and attributes', () => {
    const state: State = {
      posture: 'book',
      fold: { x: 455.5, y: 0, width: 40, height: 669 },
      regions: [
        { x: 0, y: 0, width: 455.5, height: 669 },
        { x: 495.5, y: 0, width: 455.5, height: 669 },
      ],
      sizeClass: 'regular',
      safeArea: { top: 0, right: 84, bottom: 34, left: 0 },
      layoutMargins: { top: 0, right: 84, bottom: 34, left: 20 },
      source: 'bridge',
    };
    expect(toCSS(state)).toEqual({
      properties: {
        '--foldable-fold-x': '455.5px',
        '--foldable-fold-y': '0px',
        '--foldable-fold-width': '40px',
        '--foldable-fold-height': '669px',
        '--foldable-safe-area-top': '0px',
        '--foldable-safe-area-right': '84px',
        '--foldable-safe-area-bottom': '34px',
        '--foldable-safe-area-left': '0px',
        '--foldable-layout-margin-top': '0px',
        '--foldable-layout-margin-right': '84px',
        '--foldable-layout-margin-bottom': '34px',
        '--foldable-layout-margin-left': '20px',
      },
      attributes: {
        'data-foldable-posture': 'book',
        'data-foldable-size-class': 'regular',
        'data-foldable-fold': 'active',
        'data-foldable-source': 'bridge',
      },
    });
  });

  test('an inactive Fold writes 0px for every Fold property', () => {
    expect(toCSS(SERVER_STATE)).toEqual({
      properties: {
        '--foldable-fold-x': '0px',
        '--foldable-fold-y': '0px',
        '--foldable-fold-width': '0px',
        '--foldable-fold-height': '0px',
        '--foldable-safe-area-top': '0px',
        '--foldable-safe-area-right': '0px',
        '--foldable-safe-area-bottom': '0px',
        '--foldable-safe-area-left': '0px',
        '--foldable-layout-margin-top': '0px',
        '--foldable-layout-margin-right': '0px',
        '--foldable-layout-margin-bottom': '0px',
        '--foldable-layout-margin-left': '0px',
      },
      attributes: {
        'data-foldable-posture': 'none',
        'data-foldable-size-class': 'compact',
        'data-foldable-fold': 'inactive',
        'data-foldable-source': 'fallback',
      },
    });
  });
});

describe('SERVER_STATE', () => {
  test('is the frozen "not yet known" state', () => {
    expect(SERVER_STATE).toEqual({
      posture: 'none',
      fold: null,
      regions: [{ x: 0, y: 0, width: 0, height: 0 }],
      sizeClass: 'compact',
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      layoutMargins: { top: 0, right: 0, bottom: 0, left: 0 },
      source: 'fallback',
    });
    expect(Object.isFrozen(SERVER_STATE)).toBe(true);
  });
});
