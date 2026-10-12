import { page } from 'vitest/browser';
import { expect, test } from 'vitest';
import { getState, subscribe } from '../src/index';
import type { State } from '../src/index';
import type { BridgeState } from '../src/types';
import { skewFixtures } from './fixtures';
import { readHtml } from './support/html';
import { installBridge } from './support/install-bridge';

const fixture = skewFixtures.find((f) => f.name === 'version-2');
if (fixture === undefined) throw new Error('missing version-2 skew fixture');
// The real v1 bootstrap writes this as Bridge CSS; only the reported version is foreign.
const sent = fixture.sent as BridgeState;
const bridge = installBridge(sent, { version: fixture.version });

const { state: s, posture } = fixture.expected;
const fallbackHtml = {
  '--foldable-fold-x': '0px',
  '--foldable-fold-y': '0px',
  '--foldable-fold-width': '0px',
  '--foldable-fold-height': '0px',
  '--foldable-safe-area-top': `${s.safeArea.top}px`,
  '--foldable-safe-area-right': `${s.safeArea.right}px`,
  '--foldable-safe-area-bottom': `${s.safeArea.bottom}px`,
  '--foldable-safe-area-left': `${s.safeArea.left}px`,
  '--foldable-layout-margin-top': `${s.layoutMargins.top}px`,
  '--foldable-layout-margin-right': `${s.layoutMargins.right}px`,
  '--foldable-layout-margin-bottom': `${s.layoutMargins.bottom}px`,
  '--foldable-layout-margin-left': `${s.layoutMargins.left}px`,
  'data-foldable-posture': posture,
  'data-foldable-size-class': s.sizeClass,
  'data-foldable-fold': 'inactive',
  'data-foldable-source': 'fallback',
};

test('version 2: getState() is the fallback state, not the Bridge state', async () => {
  await page.viewport(fixture.viewport.width, fixture.viewport.height);
  expect(getState()).toEqual({
    ...s,
    posture,
    regions: [{ x: 0, y: 0, ...fixture.viewport }],
    source: 'fallback',
  });
  expect(readHtml()).toEqual(fallbackHtml);
});

test('version 2: after each bootstrap write, <html> is the core fallback output again', () => {
  const seen: State[] = [];
  const unsubscribe = subscribe((next) => seen.push(next));

  bridge.push(sent);
  expect(readHtml()).toEqual(fallbackHtml);
  bridge.push({ ...sent, sizeClass: 'regular', fold: null });
  expect(readHtml()).toEqual(fallbackHtml);

  unsubscribe();
  expect(seen).toEqual([]);
});
