import bookCompact from '../../../fixtures/bridge/book-compact.json';
import bookRegular from '../../../fixtures/bridge/book-regular.json';
import innerFlat from '../../../fixtures/bridge/inner-flat.json';
import innerSplitLeft from '../../../fixtures/bridge/inner-split-left.json';
import innerSplitRight from '../../../fixtures/bridge/inner-split-right.json';
import outerLandscape from '../../../fixtures/bridge/outer-landscape.json';
import outerPortrait from '../../../fixtures/bridge/outer-portrait.json';
import tabletop from '../../../fixtures/bridge/tabletop.json';
import missingLayoutMargins from '../../../fixtures/skew/missing-layout-margins.json';
import missingSafeArea from '../../../fixtures/skew/missing-safe-area.json';
import missingSizeClass from '../../../fixtures/skew/missing-size-class.json';
import sentPosture from '../../../fixtures/skew/sent-posture.json';
import unknownField from '../../../fixtures/skew/unknown-field.json';
import version2 from '../../../fixtures/skew/version-2.json';
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
import type { BridgeState, Insets, Posture, Rect, SizeClass, Source } from '../src/types';

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

/** What a bootstrap of another version may put on the global, and what this core makes of it. */
export type SkewFixture = {
  name: string;
  description: string;
  /** `version` on the global. */
  version: number;
  viewport: { width: number; height: number };
  /** What the page reads on its own: the `env()` probe (desktop WebKit has no safe area) and the 520 px rule. */
  probe: { safeArea: Insets; sizeClass: SizeClass };
  /** Deliberately untyped: this is the foreign side of the boundary. */
  sent: Record<string, unknown>;
  expected: { source: Source; state: BridgeState; posture: Posture };
};

export const skewFixtures = [
  unknownField,
  sentPosture,
  missingSafeArea,
  missingLayoutMargins,
  missingSizeClass,
  version2,
] as SkewFixture[];

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
