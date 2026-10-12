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
type Expected = { primary: Rect; secondary: Rect };

document.body.style.margin = '0';

// The primary's intrinsic height when layered and collapsed.
const PRIMARY_CONTENT_HEIGHT = 100;

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
  edge?: string;
  state?: 'collapsed' | 'expanded';
  axes?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  box?: Rect;
  offset?: { x: number; y: number };
  /** DOM order; the guidance is secondary first, but stacking must not depend on it. */
  primaryFirst?: boolean;
};

async function mount(
  snapshot: BridgeState,
  viewport: { width: number; height: number },
  o: Mount = {},
): Promise<{ primary: HTMLElement; secondary: HTMLElement }> {
  await page.viewport(viewport.width, viewport.height);
  bridge.push(snapshot);

  const root = document.createElement('div');
  root.dataset.foldableArrangement = 'overlay';
  if (o.edge !== undefined) root.dataset.foldableOverlayEdge = o.edge;
  if (o.state !== undefined) root.dataset.foldableOverlayState = o.state;
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
  if (o.offset !== undefined) {
    root.style.setProperty('--foldable-arrangement-offset-x', `${o.offset.x}px`);
    root.style.setProperty('--foldable-arrangement-offset-y', `${o.offset.y}px`);
  }

  const primary = document.createElement('div');
  primary.dataset.foldableView = 'primary';
  const content = document.createElement('div');
  content.style.height = `${PRIMARY_CONTENT_HEIGHT}px`;
  primary.append(content);
  const secondary = document.createElement('div');
  secondary.dataset.foldableView = 'secondary';
  if (o.primaryFirst === true) root.append(primary, secondary);
  else root.append(secondary, primary);
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

async function expectOverlay(
  f: BridgeFixture,
  expected: Expected,
  o: Mount = {},
): Promise<{ primary: HTMLElement; secondary: HTMLElement }> {
  const views = await mount(f.snapshot, f.viewport, o);
  expectRect(rect(views.primary), expected.primary);
  expectRect(rect(views.secondary), expected.secondary);
  return views;
}

const r = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

function fail(): never {
  throw new Error('missing expected rects');
}

// Expected geometry is worked out by hand from the v0.1 Overlay rules (primitives.md), per fixture.
// Layered: the secondary fills; the primary is bottom-aligned at its intrinsic height.
const ltr: Record<string, Expected> = {
  'outer-portrait': { primary: r(0, 578, 466, 100), secondary: r(0, 0, 466, 678) },
  'outer-landscape': { primary: r(0, 366, 678, 100), secondary: r(0, 0, 678, 466) },
  'inner-flat': { primary: r(0, 569, 951, 100), secondary: r(0, 0, 951, 669) },
  'inner-split-left': { primary: r(0, 569, 469, 100), secondary: r(0, 0, 469, 669) },
  'inner-split-right': { primary: r(0, 569, 469, 100), secondary: r(0, 0, 469, 669) },
  // Separated: one view per Region, the primary trailing (book) or bottom (tabletop).
  'book-regular': { primary: r(495.5, 0, 455.5, 669), secondary: r(0, 0, 455.5, 669) },
  // Split View left app: the Fold is clipped, so only the leading Region exists. Both views
  // layer inside it, as when flat, so neither the foreground nor the background is lost.
  'book-compact': { primary: r(0, 569, 455.5, 100), secondary: r(0, 0, 455.5, 669) },
  tabletop: { primary: r(0, 495.5, 669, 455.5), secondary: r(0, 0, 669, 455.5) },
};

// RTL: trailing is the physical left, so book mirrors; layered and tabletop don't change.
const rtl: Record<string, Expected> = {
  ...ltr,
  'book-regular': { primary: r(0, 0, 455.5, 669), secondary: r(495.5, 0, 455.5, 669) },
  // The clipped Fold sits on the trailing (left) edge in RTL, so the only Region is trailing
  // (physical 0 to 455.5); both views still layer inside it.
};

test('every Bridge fixture has an Overlay case', () => {
  expect(Object.keys(ltr).sort()).toEqual(bridgeFixtures.map((f) => f.name).sort());
});

describe.each(Object.keys(ltr))('overlay %s', (name) => {
  test('LTR view rects', async () => {
    await expectOverlay(fixture(name), ltr[name] ?? fail());
  });

  test('RTL view rects', async () => {
    await expectOverlay(fixture(name), rtl[name] ?? fail(), { dir: 'rtl' });
  });
});

describe('separated edge override', () => {
  test('book: leading puts the primary in the leading Region', async () => {
    await expectOverlay(
      fixture('book-regular'),
      { primary: r(0, 0, 455.5, 669), secondary: r(495.5, 0, 455.5, 669) },
      { edge: 'leading' },
    );
  });

  test('book RTL: leading is the physical right', async () => {
    await expectOverlay(
      fixture('book-regular'),
      { primary: r(495.5, 0, 455.5, 669), secondary: r(0, 0, 455.5, 669) },
      { edge: 'leading', dir: 'rtl' },
    );
  });

  test('book: an explicit trailing matches the default', async () => {
    await expectOverlay(fixture('book-regular'), ltr['book-regular'] ?? fail(), {
      edge: 'trailing bottom',
    });
  });

  test('tabletop: top puts the primary in the top Region', async () => {
    await expectOverlay(
      fixture('tabletop'),
      { primary: r(0, 0, 669, 455.5), secondary: r(0, 495.5, 669, 455.5) },
      { edge: 'top' },
    );
  });

  test('tokens for the other axis do not affect it', async () => {
    await expectOverlay(fixture('book-regular'), ltr['book-regular'] ?? fail(), { edge: 'top' });
    document.body.replaceChildren();
    await expectOverlay(fixture('tabletop'), ltr.tabletop ?? fail(), { edge: 'leading' });
  });

  test('both tokens: each axis takes its own', async () => {
    await expectOverlay(
      fixture('book-regular'),
      { primary: r(0, 0, 455.5, 669), secondary: r(495.5, 0, 455.5, 669) },
      { edge: 'leading top' },
    );
    document.body.replaceChildren();
    await expectOverlay(
      fixture('tabletop'),
      { primary: r(0, 0, 669, 455.5), secondary: r(0, 495.5, 669, 455.5) },
      { edge: 'leading top' },
    );
  });

  test('book compact with leading: the only Region still layers both views', async () => {
    await expectOverlay(fixture('book-compact'), ltr['book-compact'] ?? fail(), {
      edge: 'leading',
    });
  });
});

describe('separated', () => {
  test('expanded does nothing and the secondary stays visible', async () => {
    for (const name of ['book-regular', 'tabletop']) {
      const { secondary } = await expectOverlay(fixture(name), ltr[name] ?? fail(), {
        state: 'expanded',
      });
      expect(getComputedStyle(secondary).visibility).toBe('visible');
      document.body.replaceChildren();
    }
  });

  test('aspect ratio and axes do not apply', async () => {
    await expectOverlay(fixture('book-regular'), ltr['book-regular'] ?? fail(), {
      axes: 'vertical',
    });
    document.body.replaceChildren();
    const { secondary } = await expectOverlay(fixture('inner-flat'), ltr['inner-flat'] ?? fail(), {
      axes: 'vertical',
    });
    expect(getComputedStyle(secondary).display).not.toBe('none');
  });

  test('tall primary content stays inside its Region', async () => {
    const cases: [string, Rect][] = [
      ['book-regular', ltr['book-regular']?.primary ?? fail()],
      ['tabletop', ltr.tabletop?.primary ?? fail()],
      ['book-compact', r(0, 0, 455.5, 669)],
      ['inner-flat', r(0, 0, 951, 669)],
    ];
    for (const [name, region] of cases) {
      const f = fixture(name);
      const { primary } = await mount(f.snapshot, f.viewport);
      const content = primary.firstElementChild;
      if (!(content instanceof HTMLElement)) throw new Error('no primary content');
      content.style.height = '2000px';
      expectRect(rect(primary), region);
      document.body.replaceChildren();
    }
  });

  test('the primary is on top in the one-Region case', async () => {
    const { primary } = await expectOverlay(fixture('book-compact'), ltr['book-compact'] ?? fail());
    expect(primary.contains(document.elementFromPoint(200, 620))).toBe(true);
  });
});

describe('box offset', () => {
  test('book: a box not at the viewport origin still separates at the Fold', async () => {
    await expectOverlay(
      fixture('book-regular'),
      { primary: r(495.5, 0, 455.5, 669), secondary: r(100, 0, 355.5, 669) },
      { box: r(100, 0, 851, 669), offset: { x: 100, y: 0 } },
    );
  });

  test('book RTL with offset', async () => {
    await expectOverlay(
      fixture('book-regular'),
      { primary: r(100, 0, 355.5, 669), secondary: r(495.5, 0, 455.5, 669) },
      { box: r(100, 0, 851, 669), offset: { x: 100, y: 0 }, dir: 'rtl' },
    );
  });

  test('tabletop: offset-y', async () => {
    await expectOverlay(
      fixture('tabletop'),
      { primary: r(0, 495.5, 669, 455.5), secondary: r(0, 60, 669, 395.5) },
      { box: r(0, 60, 669, 891), offset: { x: 0, y: 60 } },
    );
  });

  test('layered: the primary is bottom-aligned in an offset box', async () => {
    await expectOverlay(
      fixture('inner-flat'),
      { primary: r(100, 469, 751, 100), secondary: r(100, 50, 751, 519) },
      { box: r(100, 50, 751, 519), offset: { x: 100, y: 50 } },
    );
  });
});

describe('layered stacking', () => {
  test.each([
    ['secondary first (the DOM guidance)', false],
    ['primary first', true],
  ])('the primary is on top with %s', async (_, primaryFirst) => {
    const { primary, secondary } = await expectOverlay(
      fixture('inner-flat'),
      ltr['inner-flat'] ?? fail(),
      {
        primaryFirst,
      },
    );
    expect(primary.contains(document.elementFromPoint(475, 620))).toBe(true);
    expect(document.elementFromPoint(475, 300)).toBe(secondary);
  });
});

describe('clipped Fold (one Region) expanded', () => {
  // Layered inside the only Region, so `expanded` applies as when flat.
  test.each([
    ['LTR', 'ltr'],
    ['RTL', 'rtl'],
  ] as const)('%s: the primary fills the Region and the secondary is hidden', async (_, dir) => {
    const region = r(0, 0, 455.5, 669);
    const { primary, secondary } = await expectOverlay(
      fixture('book-compact'),
      { primary: region, secondary: region },
      { state: 'expanded', dir },
    );
    expect(getComputedStyle(secondary).visibility).toBe('hidden');
    expect(primary.contains(document.elementFromPoint(200, 300))).toBe(true);
  });

  test('collapsed keeps the secondary visible', async () => {
    const { secondary } = await expectOverlay(
      fixture('book-compact'),
      ltr['book-compact'] ?? fail(),
      {
        state: 'collapsed',
      },
    );
    expect(getComputedStyle(secondary).visibility).toBe('visible');
  });
});

describe('layered expanded', () => {
  test('the primary fills and the secondary is visibility:hidden', async () => {
    const { primary, secondary } = await expectOverlay(
      fixture('inner-flat'),
      { primary: r(0, 0, 951, 669), secondary: r(0, 0, 951, 669) },
      { state: 'expanded' },
    );
    expect(getComputedStyle(secondary).visibility).toBe('hidden');
    expect(primary.contains(document.elementFromPoint(475, 300))).toBe(true);
  });

  test('collapsed (explicit or default) keeps the secondary visible', async () => {
    for (const state of [undefined, 'collapsed'] as const) {
      const { secondary } = await expectOverlay(
        fixture('inner-flat'),
        ltr['inner-flat'] ?? fail(),
        {
          ...(state === undefined ? {} : { state }),
        },
      );
      expect(getComputedStyle(secondary).visibility).toBe('visible');
      document.body.replaceChildren();
    }
  });
});
