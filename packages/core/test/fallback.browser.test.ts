import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { getState, subscribe } from '../src/index';
import type { State } from '../src/index';
import { readHtml } from './support/html';

// Desktop WebKit has no safe area, so the probe reads 0 and margins are the system minimum.
const html = (sizeClass: 'compact' | 'regular'): Record<string, string> => ({
  '--foldable-fold-x': '0px',
  '--foldable-fold-y': '0px',
  '--foldable-fold-width': '0px',
  '--foldable-fold-height': '0px',
  '--foldable-safe-area-top': '0px',
  '--foldable-safe-area-right': '0px',
  '--foldable-safe-area-bottom': '0px',
  '--foldable-safe-area-left': '0px',
  '--foldable-layout-margin-top': '0px',
  '--foldable-layout-margin-right': '20px',
  '--foldable-layout-margin-bottom': '0px',
  '--foldable-layout-margin-left': '20px',
  'data-foldable-posture': 'none',
  'data-foldable-size-class': sizeClass,
  'data-foldable-fold': 'inactive',
  'data-foldable-source': 'fallback',
});

// Resize and media query `change` events land after page.viewport() resolves.
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100));

async function resizeTo(width: number, height: number): Promise<void> {
  await page.viewport(width, height);
  await settle();
}

describe.each([
  [466, 498, 'compact'],
  [678, 466, 'compact'],
  [519, 800, 'compact'],
  [520, 520, 'regular'],
  [951, 589, 'regular'],
] as const)('fallback at %d×%d', (width, height, sizeClass) => {
  test(`is ${sizeClass}`, async () => {
    await resizeTo(width, height);
    const state = getState();

    expect(readHtml()).toEqual(html(sizeClass));
    expect(state).toEqual({
      posture: 'none',
      fold: null,
      regions: [{ x: 0, y: 0, width, height }],
      sizeClass,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      layoutMargins: { top: 0, right: 20, bottom: 0, left: 20 },
      source: 'fallback',
    });
  });
});

describe('updates', () => {
  test('resizing across 520 px notifies once per crossing', async () => {
    await resizeTo(519, 800);
    const seen: State[] = [];
    const unsubscribe = subscribe((s) => seen.push(s));

    await resizeTo(520, 800);
    await resizeTo(519, 800);
    unsubscribe();

    expect(seen.map((s) => s.sizeClass)).toEqual(['regular', 'compact']);
  });

  test('a resize that leaves the state unchanged notifies nothing', async () => {
    await resizeTo(600, 600);
    const before = getState();
    const seen: State[] = [];
    const unsubscribe = subscribe((s) => seen.push(s));

    window.dispatchEvent(new Event('resize'));
    await resizeTo(600, 600);
    unsubscribe();

    expect(seen).toEqual([]);
    expect(getState()).toBe(before);
  });
});
