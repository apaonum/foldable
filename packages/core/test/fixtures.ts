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
import sentPosture from '../../../fixtures/skew/sent-posture.json';
import unknownField from '../../../fixtures/skew/unknown-field.json';
import version2 from '../../../fixtures/skew/version-2.json';
import type { BridgeState, Insets, Posture, Rect, Source } from '../src/types';

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
  /** What the page's `env()` probe reads; desktop WebKit has no safe area. */
  probe: { safeArea: Insets };
  /** Deliberately untyped: this is the foreign side of the boundary. */
  sent: Record<string, unknown>;
  expected: { source: Source; state: BridgeState; posture: Posture };
};

export const skewFixtures = [
  unknownField,
  sentPosture,
  missingSafeArea,
  missingLayoutMargins,
  version2,
] as SkewFixture[];
