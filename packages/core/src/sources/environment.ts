import type { Viewport } from '../derive';
import type { BridgeState, Insets, SizeClass } from '../types';

/** UIKit's minimum horizontal layout margin, in CSS px. */
export const SYSTEM_MARGIN = 20;

/** Both sides, so a wide-but-short outer landscape (678×466) stays compact like native. */
export const SIZE_CLASS_QUERY = '(min-width: 520px) and (min-height: 520px)';

/** Native layout margins without a Bridge: right in nearly every captured state. */
export function approximateLayoutMargins(safeArea: Insets): Insets {
  return {
    top: safeArea.top,
    right: Math.max(safeArea.right, SYSTEM_MARGIN),
    bottom: safeArea.bottom,
    left: Math.max(safeArea.left, SYSTEM_MARGIN),
  };
}

export const viewportOf = (win: Window): Viewport => ({
  width: win.innerWidth,
  height: win.innerHeight,
});

/** What the page can observe on its own, shared by the `web` and `fallback` sources. */
export type Environment = Readonly<{
  sizeClass(): SizeClass;
  safeArea(): Insets;
  /** Everything but the Fold: Size Class, safe area and approximated layout margins. */
  read(): Omit<BridgeState, 'fold'>;
  /** Calls `onChange` on `resize` and on Size Class query `change`. */
  listen(onChange: () => void): void;
}>;

const px = (value: string): number => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export function environment(win: Window): Environment {
  const query = win.matchMedia(SIZE_CLASS_QUERY);
  let probe: HTMLElement | undefined;

  // `env()` only resolves inside CSS, so a hidden element carries it as padding.
  const ensureProbe = (): HTMLElement => {
    if (probe !== undefined) return probe;
    const doc = win.document;
    const el = doc.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
      'env(safe-area-inset-bottom) env(safe-area-inset-left);';
    // <html>, not <body>: the core may attach from a <head> script before <body> exists.
    doc.documentElement.append(el);
    probe = el;
    return el;
  };

  const sizeClass = (): SizeClass => (query.matches ? 'regular' : 'compact');
  const safeArea = (): Insets => {
    const style = win.getComputedStyle(ensureProbe());
    return {
      top: px(style.paddingTop),
      right: px(style.paddingRight),
      bottom: px(style.paddingBottom),
      left: px(style.paddingLeft),
    };
  };

  return {
    sizeClass,
    safeArea,
    read: () => {
      const insets = safeArea();
      return {
        sizeClass: sizeClass(),
        safeArea: insets,
        layoutMargins: approximateLayoutMargins(insets),
      };
    },
    listen: (onChange) => {
      win.addEventListener('resize', onChange);
      query.addEventListener('change', onChange);
    },
  };
}
