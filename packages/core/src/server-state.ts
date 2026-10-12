import type { Insets, State } from './types';

const ZERO_INSETS: Insets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

/** The state before anything is known (SSR, before hydration). Compare by reference. */
export const SERVER_STATE: State = Object.freeze({
  posture: 'none',
  fold: null,
  regions: Object.freeze([Object.freeze({ x: 0, y: 0, width: 0, height: 0 })]),
  sizeClass: 'compact',
  safeArea: ZERO_INSETS,
  layoutMargins: ZERO_INSETS,
  source: 'fallback',
});
