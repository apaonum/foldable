import type { Posture, Rect } from './types';

export function posture(fold: Rect | null): Posture {
  if (fold === null) return 'none';
  return fold.height > fold.width ? 'book' : 'tabletop';
}

export type Viewport = Readonly<{ width: number; height: number }>;

/** The viewport minus the Fold, in physical order (left→right, top→bottom). */
export function regions(fold: Rect | null, viewport: Viewport): readonly Rect[] {
  const { width, height } = viewport;
  if (fold === null) return [{ x: 0, y: 0, width, height }];
  if (posture(fold) === 'book') {
    const end = fold.x + fold.width;
    return [
      { x: 0, y: 0, width: fold.x, height },
      { x: end, y: 0, width: width - end, height },
    ];
  }
  const end = fold.y + fold.height;
  return [
    { x: 0, y: 0, width, height: fold.y },
    { x: 0, y: end, width, height: height - end },
  ];
}
