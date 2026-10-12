import type { Reader } from './reader';

const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };

// shortcut: stands in for the `web` (#29) and `fallback` (#28) readers until they land.
export function placeholderReader(source: 'web' | 'fallback'): Reader {
  return {
    source,
    read: () => ({ fold: null, sizeClass: 'compact', safeArea: ZERO, layoutMargins: ZERO }),
    listen: () => undefined,
  };
}
