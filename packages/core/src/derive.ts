import type { Posture, Rect } from './types';

export function posture(fold: Rect | null): Posture {
  if (fold === null) return 'none';
  return fold.height > fold.width ? 'book' : 'tabletop';
}

export type Viewport = Readonly<{ width: number; height: number }>;

/**
 * The viewport minus the Fold, in physical order (left→right, top→bottom).
 * Zero-area sides are dropped: in Split View the Fold can be clipped to the window edge.
 */
export function regions(fold: Rect | null, viewport: Viewport): readonly Rect[] {
  const { width, height } = viewport;
  if (fold === null) return [{ x: 0, y: 0, width, height }];
  let sides: Rect[];
  if (posture(fold) === 'book') {
    const end = fold.x + fold.width;
    sides = [
      { x: 0, y: 0, width: fold.x, height },
      { x: end, y: 0, width: width - end, height },
    ];
  } else {
    const end = fold.y + fold.height;
    sides = [
      { x: 0, y: 0, width, height: fold.y },
      { x: 0, y: end, width, height: height - end },
    ];
  }
  return sides.filter((r) => r.width > 0 && r.height > 0);
}
