import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { getState, subscribe } from '../src/index';
import { bridgeFixtures } from './fixtures';
import { readHtml } from './support/html';
import { installBridge } from './support/install-bridge';

const [first] = bridgeFixtures;
if (first === undefined) throw new Error('no Bridge fixtures');
const bridge = installBridge(first.snapshot);

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
