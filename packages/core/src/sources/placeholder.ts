import type { Reader } from './reader';

const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };

// shortcut: stands in for the `web` reader until #29 lands.
export function placeholderReader(): Reader {
  return {
    source: 'web',
    read: () => ({ fold: null, sizeClass: 'compact', safeArea: ZERO, layoutMargins: ZERO }),
    listen: () => undefined,
  };
}
