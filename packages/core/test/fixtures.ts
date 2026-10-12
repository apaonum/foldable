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
