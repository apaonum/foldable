import type { Viewport } from '../derive';
import type { Rect } from '../types';
import { environment, viewportOf } from './environment';
import type { Reader } from './reader';

/** Native reserves 20 pt on each side of the line between segments. */
export const FOLD_MARGIN = 20;

/** The segments describe another orientation; keep the previous Fold. */
export const STALE = Symbol('stale');

/**
 * The Fold for Safari's Viewport Segments, matching what the Bridge would send.
 * Segment extents along the line are not clipped to the viewport, so only the line is used.
 */
export function webFold(segments: readonly Rect[], viewport: Viewport): Rect | null | typeof STALE {
  // Rotation fires `resize` about 1 s before the segments update. Union, not sum: tabletop
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

/** Viewport Segments, Safari-only behind a flag; not in TypeScript's DOM lib. */
export type SegmentsWindow = Window & { viewport?: { segments?: readonly DOMRectReadOnly[] } };

// No `segmentschange` event fires in Safari; these media queries do.
const SEGMENT_QUERIES = ['(horizontal-viewport-segments: 2)', '(vertical-viewport-segments: 2)'];

// Segments can lag the viewport (at load, and ~1 s after rotation) and catch up with no event.
const STALE_FRAMES = 180;

/** Safari with the Viewport Segments flag on. Device Posture is ignored. */
export function webReader(win: SegmentsWindow): Reader {
  const env = environment(win);
  let fold: Rect | null = null;
  let stale = false;
  let notify: (() => void) | undefined;
  let polling = false;

  // While the segments disagree with the viewport, re-read every frame until they agree.
  const pollWhileStale = (): void => {
    if (polling || notify === undefined) return;
    polling = true;
    let frames = 0;
    const tick = (): void => {
      notify?.();
      if (stale && ++frames < STALE_FRAMES) win.requestAnimationFrame(tick);
      else polling = false;
    };
    win.requestAnimationFrame(tick);
  };

  return {
    source: 'web',
    read: () => {
      const segments = (win.viewport?.segments ?? []).map(({ x, y, width, height }) => ({
        x,
        y,
        width,
        height,
      }));
      const next = webFold(segments, viewportOf(win));
      stale = next === STALE;
      if (next !== STALE) fold = next;
      else pollWhileStale();
      return { fold, ...env.read() };
    },
    listen: (onChange) => {
      notify = onChange;
      env.listen(onChange);
      for (const query of SEGMENT_QUERIES) {
        win.matchMedia(query).addEventListener('change', onChange);
      }
      if (stale) pollWhileStale();
    },
  };
}
