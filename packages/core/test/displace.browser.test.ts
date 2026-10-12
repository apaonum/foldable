import { page } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import '../src/primitives.css';
import { bridgeFixtures } from './fixtures';
import type { BridgeFixture } from './fixtures';
import { installBridge } from './support/install-bridge';

function fixture(name: string): BridgeFixture {
  const found = bridgeFixtures.find((f) => f.name === name);
  if (found === undefined) throw new Error(`no Bridge fixture ${name}`);
  return found;
}

// No core import: the primitives must work with only the bootstrap.
const bridge = installBridge(fixture('inner-flat').snapshot);

async function show(f: BridgeFixture): Promise<void> {
  await page.viewport(f.viewport.width, f.viewport.height);
  bridge.push(f.snapshot);
}

function mount(tokens: string, dir: 'ltr' | 'rtl' = 'ltr'): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.dir = dir;
  const box = document.createElement('div');
  box.setAttribute('data-foldable-displace', tokens);
  wrapper.append(box);
  document.body.append(wrapper);
  return box;
}

type Box = { x: number; y: number; width: number; height: number };

function expectRect(el: Element, expected: Box): void {
  const r = el.getBoundingClientRect();
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(
      Math.abs(r[key] - expected[key]),
      `${key}: ${r[key]} vs ${expected[key]}`,
    ).toBeLessThanOrEqual(1);
  }
}

afterEach(() => {
  document.body.replaceChildren();
});

// Expected rects: the target Region from the fixture, intersected with the viewport minus its safe area.
const LEFT_BOOK = { x: 0, y: 0, width: 455.5, height: 635 };
const RIGHT_BOOK = { x: 495.5, y: 0, width: 371.5, height: 635 };
const TOP_TABLETOP = { x: 0, y: 82, width: 669, height: 373.5 };
const BOTTOM_TABLETOP = { x: 0, y: 495.5, width: 669, height: 421.5 };

describe.each([
  ['book-regular', '', 'ltr', RIGHT_BOOK],
  ['book-regular', 'trailing', 'ltr', RIGHT_BOOK],
  ['book-regular', 'leading', 'ltr', LEFT_BOOK],
  ['book-regular', 'leading bottom', 'ltr', LEFT_BOOK],
  ['book-regular', '', 'rtl', LEFT_BOOK],
  ['book-regular', 'trailing', 'rtl', LEFT_BOOK],
  ['book-regular', 'leading', 'rtl', RIGHT_BOOK],
  ['tabletop', '', 'ltr', BOTTOM_TABLETOP],
  ['tabletop', 'bottom', 'ltr', BOTTOM_TABLETOP],
  ['tabletop', 'top', 'ltr', TOP_TABLETOP],
  ['tabletop', 'leading top', 'ltr', TOP_TABLETOP],
  ['tabletop', '', 'rtl', BOTTOM_TABLETOP],
  ['tabletop', 'top', 'rtl', TOP_TABLETOP],
  ['inner-flat', '', 'ltr', { x: 0, y: 0, width: 867, height: 635 }],
  ['inner-flat', 'leading top', 'rtl', { x: 0, y: 0, width: 867, height: 635 }],
  ['outer-portrait', 'trailing', 'ltr', { x: 0, y: 0, width: 382, height: 644 }],
  // The Fold is clipped to the window, so the only Region is the fallback target.
  ['book-compact', '', 'ltr', { x: 0, y: 0, width: 455.5, height: 635 }],
  ['book-compact', 'leading', 'ltr', { x: 0, y: 0, width: 455.5, height: 635 }],
  // RTL: trailing is the physical left Region, which exists; leading (physical right) is
  // missing, so it falls back to the same Region.
  ['book-compact', '', 'rtl', { x: 0, y: 0, width: 455.5, height: 635 }],
  ['book-compact', 'trailing', 'rtl', { x: 0, y: 0, width: 455.5, height: 635 }],
  ['book-compact', 'leading', 'rtl', { x: 0, y: 0, width: 455.5, height: 635 }],
] as const)('%s, displace="%s", %s', (name, tokens, dir, expected) => {
  test('the box covers the target Region inside the safe area', async () => {
    await show(fixture(name));
    expectRect(mount(tokens, dir), expected);
  });
});

describe('click-through', () => {
  test('hits content beneath the box and a pointer-events: auto control inside it', async () => {
    await show(fixture('book-regular'));
    const beneath = document.createElement('button');
    beneath.style.cssText = 'position: fixed; inset: 0;';
    document.body.append(beneath);
    const box = mount('');
    const control = document.createElement('button');
    control.style.cssText = 'pointer-events: auto; width: 50px; height: 50px;';
    box.append(control);

    expect(document.elementFromPoint(600, 300)).toBe(beneath);
    expect(document.elementFromPoint(520, 20)).toBe(control);
  });
});
