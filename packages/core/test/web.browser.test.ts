import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { getState, subscribe } from '../src/index';
import type { Rect, State } from '../src/index';
import type { SegmentsWindow } from '../src/sources/web';
import { webFixture } from './fixtures';
import { readHtml } from './support/html';

// Desktop WebKit has no Viewport Segments: stub them, and capture the segment media queries
// so a test can fire their `change` the way Safari does when segments update without a resize.
const win = window as SegmentsWindow;
const stub: { segments: Rect[] } = { segments: [] };
win.viewport = stub as unknown as NonNullable<SegmentsWindow['viewport']>;
const queries = new Map<string, MediaQueryList>();
const matchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) => {
  const list = matchMedia(query);
  queries.set(query, list);
  return list;
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100));

/** Rotation in Safari: `resize` lands first, carrying whatever segments are current. */
async function showFixture(name: string): Promise<void> {
  const f = webFixture(name);
  stub.segments = f.segments;
  await page.viewport(f.viewport.width, f.viewport.height);
  await settle();
}

const foldVars = (): Record<string, string | null> => {
  const html = readHtml();
  return {
    x: html['--foldable-fold-x'] ?? null,
    y: html['--foldable-fold-y'] ?? null,
    width: html['--foldable-fold-width'] ?? null,
    height: html['--foldable-fold-height'] ?? null,
    posture: html['data-foldable-posture'] ?? null,
    fold: html['data-foldable-fold'] ?? null,
    source: html['data-foldable-source'] ?? null,
  };
};

describe('side-by-side segments', () => {
  test('give a book Fold on the line between them', async () => {
    await showFixture('side-by-side');

    expect(getState()).toEqual({
      posture: 'book',
      fold: { x: 455.5, y: 0, width: 40, height: 589 },
      regions: [
        { x: 0, y: 0, width: 455.5, height: 589 },
        { x: 495.5, y: 0, width: 455.5, height: 589 },
      ],
      sizeClass: 'regular',
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      layoutMargins: { top: 0, right: 20, bottom: 0, left: 20 },
      source: 'web',
    });
    expect(foldVars()).toEqual({
      x: '455.5px',
      y: '0px',
      width: '40px',
      height: '589px',
      posture: 'book',
      fold: 'active',
      source: 'web',
    });
  });
});

describe('stale segments', () => {
  test('rotating to portrait keeps the book Fold until the segments catch up', async () => {
    await showFixture('side-by-side');
    const seen: State[] = [];
    const unsubscribe = subscribe((s) => seen.push(s));

    await showFixture('stale-portrait-viewport');
    const stale = getState();
    unsubscribe();

    expect(stale.fold).toEqual({ x: 455.5, y: 0, width: 40, height: 589 });
    expect(stale.posture).toBe('book');
    // The resize itself changes Regions and Size Class inputs; only the Fold is held back.
    expect(seen.map((s) => s.fold)).toEqual([{ x: 455.5, y: 0, width: 40, height: 589 }]);
  });
});

describe('stacked segments', () => {
  test('a segment media query change with no resize gives the tabletop Fold', async () => {
    await showFixture('stale-portrait-viewport');
    stub.segments = webFixture('stacked').segments;

    queries.get('(vertical-viewport-segments: 2)')?.dispatchEvent(new Event('change'));

    expect(getState()).toMatchObject({
      posture: 'tabletop',
      fold: { x: 0, y: 375.5, width: 669, height: 40 },
      regions: [
        { x: 0, y: 0, width: 669, height: 375.5 },
        { x: 0, y: 415.5, width: 669, height: 455.5 },
      ],
      source: 'web',
    });
    expect(foldVars()).toEqual({
      x: '0px',
      y: '375.5px',
      width: '669px',
      height: '40px',
      posture: 'tabletop',
      fold: 'active',
      source: 'web',
    });
  });
});

describe('one segment', () => {
  test('clears the Fold', async () => {
    await showFixture('flat');

    expect(getState()).toMatchObject({ posture: 'none', fold: null, source: 'web' });
    expect(foldVars()).toMatchObject({ width: '0px', fold: 'inactive' });
  });
});

describe('segments that catch up with no event', () => {
  test('give the Fold once they match the viewport', async () => {
    await showFixture('flat');
    await showFixture('stale-at-load');
    expect(getState().fold).toBeNull();

    stub.segments = [
      { x: 0, y: 0, width: 475.5, height: 543 },
      { x: 475.5, y: 0, width: 475.5, height: 543 },
    ];
    await settle();

    expect(getState()).toMatchObject({
      posture: 'book',
      fold: { x: 455.5, y: 0, width: 40, height: 543 },
      source: 'web',
    });
  });
});
