import type { Insets } from '../types';

/** UIKit's minimum horizontal layout margin, in CSS px. */
export const SYSTEM_MARGIN = 20;

/** Native layout margins without a Bridge: right in nearly every captured state. */
export function approximateLayoutMargins(safeArea: Insets): Insets {
  return {
    top: safeArea.top,
    right: Math.max(safeArea.right, SYSTEM_MARGIN),
    bottom: safeArea.bottom,
    left: Math.max(safeArea.left, SYSTEM_MARGIN),
  };
}
