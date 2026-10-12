import bookCompact from '../../../fixtures/bridge/book-compact.json';
import bookRegular from '../../../fixtures/bridge/book-regular.json';
import innerFlat from '../../../fixtures/bridge/inner-flat.json';
import innerSplitLeft from '../../../fixtures/bridge/inner-split-left.json';
import innerSplitRight from '../../../fixtures/bridge/inner-split-right.json';
import outerLandscape from '../../../fixtures/bridge/outer-landscape.json';
import outerPortrait from '../../../fixtures/bridge/outer-portrait.json';
import tabletop from '../../../fixtures/bridge/tabletop.json';
import type { BridgeState, Posture, Rect } from '../src/types';

export type BridgeFixture = {
  name: string;
  evidence: string;
  viewport: { width: number; height: number };
  snapshot: BridgeState;
  expected: { posture: Posture; regions: Rect[] };
};

// JSON imports widen string unions, so the cast is checked once here instead of at every use.
export const bridgeFixtures = [
  outerPortrait,
  outerLandscape,
  innerFlat,
  bookRegular,
  bookCompact,
  tabletop,
  innerSplitLeft,
  innerSplitRight,
] as BridgeFixture[];

import webBookRegular from '../../../fixtures/web/book-regular.json';
import webFlat from '../../../fixtures/web/flat.json';
import webOuterPortrait from '../../../fixtures/web/outer-portrait.json';
import webSideBySide from '../../../fixtures/web/side-by-side.json';
import webSideBySideChrome from '../../../fixtures/web/side-by-side-chrome.json';
import webSideBySideTaller from '../../../fixtures/web/side-by-side-taller.json';
import webStackedChrome from '../../../fixtures/web/stacked-chrome.json';
import webStacked from '../../../fixtures/web/stacked.json';
import webStaleLandscapeViewport from '../../../fixtures/web/stale-landscape-viewport.json';
import webStaleOuter from '../../../fixtures/web/stale-outer.json';
import webStalePortraitViewport from '../../../fixtures/web/stale-portrait-viewport.json';
import webTabletop from '../../../fixtures/web/tabletop.json';
import webUnfoldTransient from '../../../fixtures/web/unfold-transient.json';

export type WebFixture = {
  name: string;
  evidence: string;
  viewport: { width: number; height: number };
  /** `window.viewport.segments` as Safari reported it. */
  segments: Rect[];
  /** `stale`: the segments describe another orientation, so the previous Fold is kept. */
  expected: { fold: Rect | null } | { stale: true };
  /** Name of the Bridge fixture with the same geometry, whose `fold` this must equal. */
  bridge?: string;
};

export const webFixtures = [
  webFlat,
  webSideBySide,
  webSideBySideTaller,
  webSideBySideChrome,
  webUnfoldTransient,
  webStacked,
  webStackedChrome,
  webStalePortraitViewport,
  webStaleLandscapeViewport,
  webStaleOuter,
  webOuterPortrait,
  webBookRegular,
  webTabletop,
] as WebFixture[];

export const webFixture = (name: string): WebFixture => {
  const found = webFixtures.find((f) => f.name === name);
  if (found === undefined) throw new Error(`no web fixture ${name}`);
  return found;
};
