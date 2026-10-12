import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { getState, subscribe } from '../src/index';
import type { State } from '../src/index';
import { bridgeFixtures } from './fixtures';
import { readHtml } from './support/html';
import { installBridge } from './support/install-bridge';

const [first] = bridgeFixtures;
if (first === undefined) throw new Error('no Bridge fixtures');
const bridge = installBridge(first.snapshot);

// `resize` lands after page.viewport() resolves.
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100));

describe.each(bridgeFixtures.map((f) => [f.name, f] as const))('push %s', (_, f) => {
  test('<html> gets the CSS vars and attributes', async () => {
    await page.viewport(f.viewport.width, f.viewport.height);
    bridge.push(f.snapshot);

    const { fold, safeArea: s, layoutMargins: m } = f.snapshot;
    expect(readHtml()).toEqual({
      '--foldable-fold-x': `${fold?.x ?? 0}px`,
      '--foldable-fold-y': `${fold?.y ?? 0}px`,
      '--foldable-fold-width': `${fold?.width ?? 0}px`,
      '--foldable-fold-height': `${fold?.height ?? 0}px`,
      '--foldable-safe-area-top': `${s.top}px`,
      '--foldable-safe-area-right': `${s.right}px`,
      '--foldable-safe-area-bottom': `${s.bottom}px`,
      '--foldable-safe-area-left': `${s.left}px`,
      '--foldable-layout-margin-top': `${m.top}px`,
      '--foldable-layout-margin-right': `${m.right}px`,
      '--foldable-layout-margin-bottom': `${m.bottom}px`,
      '--foldable-layout-margin-left': `${m.left}px`,
      'data-foldable-posture': f.expected.posture,
      'data-foldable-size-class': f.snapshot.sizeClass,
      'data-foldable-fold': fold === null ? 'inactive' : 'active',
      'data-foldable-source': 'bridge',
    });
  });

  test('getState() returns the derived Posture and Regions', () => {
    const state = getState();
    expect(state).toEqual({
      ...f.snapshot,
      posture: f.expected.posture,
      regions: f.expected.regions,
      source: 'bridge',
    });
    expect(getState()).toBe(state);
    expect(Object.isFrozen(state)).toBe(true);
  });
});

describe('subscribe()', () => {
  test('fires once per push and stops after unsubscribe', () => {
    bridge.push({ ...first.snapshot, sizeClass: 'compact' });
    const seen: string[] = [];
    const unsubscribe = subscribe((s) => seen.push(s.sizeClass));

    bridge.push({ ...first.snapshot, sizeClass: 'regular' });
    bridge.push({ ...first.snapshot, sizeClass: 'compact' });
    unsubscribe();
    bridge.push({ ...first.snapshot, sizeClass: 'regular' });

    expect(seen).toEqual(['regular', 'compact']);
  });
});

describe('seq', () => {
  test('a push with seq <= current is dropped', () => {
    bridge.push({ ...first.snapshot, sizeClass: 'compact' }, 100);
    const before = getState();
    const seen: unknown[] = [];
    const unsubscribe = subscribe((s) => seen.push(s));

    bridge.push({ ...first.snapshot, sizeClass: 'regular' }, 100);
    bridge.push({ ...first.snapshot, sizeClass: 'regular' }, 99);

    unsubscribe();
    expect(seen).toEqual([]);
    expect(getState()).toBe(before);
    expect(document.documentElement.getAttribute('data-foldable-size-class')).toBe('compact');
  });
});

describe('resize', () => {
  test('a resize with no new snapshot re-derives Regions and notifies once', async () => {
    const flat = bridgeFixtures.find((f) => f.name === 'inner-flat');
    if (flat === undefined) throw new Error('missing inner-flat fixture');
    await page.viewport(800, 600);
    bridge.push(flat.snapshot);
    await settle();
    const seen: State[] = [];
    const unsubscribe = subscribe((s) => seen.push(s));

    await page.viewport(700, 500);
    await settle();
    window.dispatchEvent(new Event('resize'));
    unsubscribe();

    expect(getState().regions).toEqual([{ x: 0, y: 0, width: 700, height: 500 }]);
    expect(seen.map((s) => s.regions)).toEqual([[{ x: 0, y: 0, width: 700, height: 500 }]]);
  });
});
