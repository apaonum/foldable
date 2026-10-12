import type { Viewport } from '../derive';
import type { Rect } from '../types';

/** Native reserves 20 pt on each side of the line between segments. */
export const FOLD_MARGIN = 20;

/** The segments describe another orientation; keep the previous Fold. */
export const STALE = Symbol('stale');

/**
 * The Fold for Safari's Viewport Segments, matching what the Bridge would send.
 * Segment extents along the line are not clipped to the viewport, so only the line is used.
 */
export function webFold(segments: readonly Rect[], viewport: Viewport): Rect | null | typeof STALE {
  // Rotation fires `resize` about 1 s before the segments update. Union, not sum: stacked
  // segments each span the full width.
  const left = Math.min(...segments.map((s) => s.x));
  const right = Math.max(...segments.map((s) => s.x + s.width));
  if (right - left !== viewport.width) return STALE;

  const [first, second] = segments;
  if (first === undefined || second === undefined || segments.length !== 2) return null;
  if (second.x > first.x) {
    return { x: second.x - FOLD_MARGIN, y: 0, width: 2 * FOLD_MARGIN, height: viewport.height };
  }
  return { x: 0, y: second.y - FOLD_MARGIN, width: viewport.width, height: 2 * FOLD_MARGIN };
}
