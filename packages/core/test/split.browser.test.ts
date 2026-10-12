// Imports only the bootstrap fake and the stylesheet, never the core: the primitives must work
// on a CSS-only page in a Host with a Bridge.
import { page } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/primitives.css';
import { bridgeFixtures } from './fixtures';
import type { BridgeFixture } from './fixtures';
import { installBridge } from './support/install-bridge';
import type { BridgeState } from '../src/types';

type Rect = { x: number; y: number; width: number; height: number };
/** `hidden`: the secondary gets `display: none` and stays mounted. */
type Expected = { primary: Rect; secondary: Rect | 'hidden' };

document.body.style.margin = '0';

const fixture = (name: string): BridgeFixture => {
  const f = bridgeFixtures.find((x) => x.name === name);
  if (f === undefined) throw new Error(`no fixture ${name}`);
  return f;
};

const bridge = installBridge(fixture('inner-flat').snapshot);

afterEach(() => {
  document.body.replaceChildren();
});

type Mount = {
  axes?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  ratio?: string;
  box?: Rect;
  offset?: { x: number; y: number };
};

async function mount(
  snapshot: BridgeState,
  viewport: { width: number; height: number },
  o: Mount = {},
): Promise<{ primary: HTMLElement; secondary: HTMLElement }> {
  await page.viewport(viewport.width, viewport.height);
  bridge.push(snapshot);

  const root = document.createElement('div');
  root.dataset.foldableArrangement = 'split';
  if (o.axes !== undefined) root.dataset.foldableAxes = o.axes;
  if (o.dir !== undefined) root.dir = o.dir;
  const box = o.box ?? { x: 0, y: 0, width: viewport.width, height: viewport.height };
  Object.assign(root.style, {
    position: 'absolute',
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });
  if (o.ratio !== undefined) root.style.setProperty('--foldable-split-ratio', o.ratio);
  if (o.offset !== undefined) {
    root.style.setProperty('--foldable-arrangement-offset-x', `${o.offset.x}px`);
    root.style.setProperty('--foldable-arrangement-offset-y', `${o.offset.y}px`);
  }

  const primary = document.createElement('div');
  primary.dataset.foldableView = 'primary';
  const secondary = document.createElement('div');
  secondary.dataset.foldableView = 'secondary';
  root.append(primary, secondary);
  document.body.append(root);
  return { primary, secondary };
}

function rect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function expectRect(actual: Rect, expected: Rect): void {
  for (const k of ['x', 'y', 'width', 'height'] as const) {
    expect(
      Math.abs(actual[k] - expected[k]),
      `${k}: ${actual[k]} vs ${expected[k]}`,
    ).toBeLessThanOrEqual(1);
  }
}

async function expectSplit(
  f: BridgeFixture,
  expected: Expected,
  o: Mount = {},
  snapshot: BridgeState = f.snapshot,
): Promise<void> {
  const { primary, secondary } = await mount(snapshot, f.viewport, o);
  expectRect(rect(primary), expected.primary);
  if (expected.secondary === 'hidden') {
    expect(getComputedStyle(secondary).display).toBe('none');
    expect(secondary.isConnected).toBe(true);
  } else {
    expect(getComputedStyle(secondary).display).not.toBe('none');
    expectRect(rect(secondary), expected.secondary);
  }
}

const r = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

// Expected geometry is worked out by hand from the v0.1 Split rules (primitives.md), per fixture.
const ltr: Record<string, Expected> = {
  'outer-portrait': { primary: r(0, 0, 466, 339), secondary: r(0, 339, 466, 339) },
  'outer-landscape': { primary: r(0, 0, 339, 466), secondary: r(339, 0, 339, 466) },
  'inner-flat': { primary: r(0, 0, 475.5, 669), secondary: r(475.5, 0, 475.5, 669) },
  'inner-split-left': { primary: r(0, 0, 469, 334.5), secondary: r(0, 334.5, 469, 334.5) },
  'inner-split-right': { primary: r(0, 0, 469, 334.5), secondary: r(0, 334.5, 469, 334.5) },
  'book-regular': { primary: r(0, 0, 455.5, 669), secondary: r(495.5, 0, 455.5, 669) },
  // Split View left app: the Fold is clipped to the window edge, so only the leading Region exists.
  // The primary takes it and the secondary is hidden.
  'book-compact': { primary: r(0, 0, 455.5, 669), secondary: 'hidden' },
  tabletop: { primary: r(0, 0, 669, 455.5), secondary: r(0, 495.5, 669, 455.5) },
};

// RTL: leading is the physical right, so horizontal splits mirror; vertical ones don't change.
const rtl: Record<string, Expected> = {
  ...ltr,
  'outer-landscape': { primary: r(339, 0, 339, 466), secondary: r(0, 0, 339, 466) },
  'inner-flat': { primary: r(475.5, 0, 475.5, 669), secondary: r(0, 0, 475.5, 669) },
  'book-regular': { primary: r(495.5, 0, 455.5, 669), secondary: r(0, 0, 455.5, 669) },
  // The clipped Fold sits on the trailing (left) edge in RTL, so the leading Region is missing
  // and the primary takes the only Region.
  'book-compact': { primary: r(0, 0, 455.5, 669), secondary: 'hidden' },
};

test('every Bridge fixture has a Split case', () => {
  expect(Object.keys(ltr).sort()).toEqual(bridgeFixtures.map((f) => f.name).sort());
});

describe.each(Object.keys(ltr))('split %s', (name) => {
  test('LTR view rects', async () => {
    await expectSplit(fixture(name), ltr[name] ?? fail());
  });

  test('RTL view rects', async () => {
    await expectSplit(fixture(name), rtl[name] ?? fail(), { dir: 'rtl' });
  });
});

describe('Fold active', () => {
  test('book + compact (Size Class lag) does not collapse', async () => {
    const f = fixture('book-regular');
    await expectSplit(
      f,
      ltr['book-regular'] ?? fail(),
      {},
      { ...f.snapshot, sizeClass: 'compact' },
    );
  });

  test('the Fold overrides the ratio', async () => {
    const f = fixture('book-regular');
    await expectSplit(f, ltr['book-regular'] ?? fail(), { ratio: '0.3' });
  });
});

describe('box offset', () => {
  test('book: a box not at the viewport origin still splits at the Fold', async () => {
    await expectSplit(
      fixture('book-regular'),
      { primary: r(100, 0, 355.5, 669), secondary: r(495.5, 0, 455.5, 669) },
      { box: r(100, 0, 851, 669), offset: { x: 100, y: 0 } },
    );
  });

  test('tabletop: offset-y', async () => {
    await expectSplit(
      fixture('tabletop'),
      { primary: r(0, 60, 669, 395.5), secondary: r(0, 495.5, 669, 455.5) },
      { box: r(0, 60, 669, 891), offset: { x: 0, y: 60 } },
    );
  });

  test('book RTL with offset', async () => {
    await expectSplit(
      fixture('book-regular'),
      { primary: r(495.5, 0, 455.5, 669), secondary: r(100, 0, 355.5, 669) },
      { box: r(100, 0, 851, 669), offset: { x: 100, y: 0 }, dir: 'rtl' },
    );
  });
});

function fail(): never {
  throw new Error('missing expected rects');
}

describe('flat ratio', () => {
  test('--foldable-split-ratio sets the primary share (landscape)', async () => {
    await expectSplit(
      fixture('inner-flat'),
      { primary: r(0, 0, 285.3, 669), secondary: r(285.3, 0, 665.7, 669) },
      { ratio: '0.3' },
    );
  });

  test('--foldable-split-ratio sets the primary share (portrait)', async () => {
    await expectSplit(
      fixture('outer-portrait'),
      { primary: r(0, 0, 466, 474.6), secondary: r(0, 474.6, 466, 203.4) },
      { ratio: '0.7' },
    );
  });
});

describe('axes restriction', () => {
  async function expectPrimaryOnly(
    f: BridgeFixture,
    axes: 'horizontal' | 'vertical',
    primary: Rect,
  ): Promise<void> {
    const views = await mount(f.snapshot, f.viewport, { axes });
    expect(getComputedStyle(views.secondary).display).toBe('none');
    expect(views.secondary.isConnected).toBe(true);
    expectRect(rect(views.primary), primary);
  }

  test('vertical-only on a landscape box shows only the primary', async () => {
    await expectPrimaryOnly(fixture('inner-flat'), 'vertical', r(0, 0, 951, 669));
  });

  test('horizontal-only on a portrait box shows only the primary', async () => {
    await expectPrimaryOnly(fixture('outer-portrait'), 'horizontal', r(0, 0, 466, 678));
  });

  test('vertical-only in book shows only the primary, in its Region', async () => {
    await expectPrimaryOnly(fixture('book-regular'), 'vertical', r(0, 0, 455.5, 669));
  });

  test('horizontal-only in tabletop shows only the primary, in its Region', async () => {
    await expectPrimaryOnly(fixture('tabletop'), 'horizontal', r(0, 0, 669, 455.5));
  });

  test('an allowed axis still splits', async () => {
    const f = fixture('book-regular');
    await expectSplit(f, ltr['book-regular'] ?? fail(), { axes: 'horizontal' });
    await expectSplit(fixture('inner-flat'), ltr['inner-flat'] ?? fail(), { axes: 'horizontal' });
    await expectSplit(fixture('tabletop'), ltr.tabletop ?? fail(), { axes: 'vertical' });
  });
});
