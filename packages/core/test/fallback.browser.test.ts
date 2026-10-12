import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { getState, subscribe } from '../src/index';
import type { State } from '../src/index';
import type { BridgeState } from '../src/types';
import { fallbackFixtures } from './fixtures';
import { readHtml } from './support/html';

const html = ({
  sizeClass,
  safeArea: s,
  layoutMargins: m,
}: BridgeState): Record<string, string> => ({
  '--foldable-fold-x': '0px',
  '--foldable-fold-y': '0px',
  '--foldable-fold-width': '0px',
  '--foldable-fold-height': '0px',
  '--foldable-safe-area-top': `${s.top}px`,
  '--foldable-safe-area-right': `${s.right}px`,
  '--foldable-safe-area-bottom': `${s.bottom}px`,
  '--foldable-safe-area-left': `${s.left}px`,
  '--foldable-layout-margin-top': `${m.top}px`,
  '--foldable-layout-margin-right': `${m.right}px`,
  '--foldable-layout-margin-bottom': `${m.bottom}px`,
  '--foldable-layout-margin-left': `${m.left}px`,
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

describe.each(fallbackFixtures.map((f) => [f.name, f] as const))('fallback %s', (_, f) => {
  test(`is ${f.expected.sizeClass}`, async () => {
    const { width, height } = f.viewport;
    await resizeTo(width, height);
    const state = getState();

    expect(readHtml()).toEqual(html(f.expected));
    expect(state).toEqual({
      ...f.expected,
      posture: 'none',
      regions: [{ x: 0, y: 0, width, height }],
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
