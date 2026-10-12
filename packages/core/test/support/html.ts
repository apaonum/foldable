const NAMES = [
  '--foldable-fold-x',
  '--foldable-fold-y',
  '--foldable-fold-width',
  '--foldable-fold-height',
  '--foldable-safe-area-top',
  '--foldable-safe-area-right',
  '--foldable-safe-area-bottom',
  '--foldable-safe-area-left',
  '--foldable-layout-margin-top',
  '--foldable-layout-margin-right',
  '--foldable-layout-margin-bottom',
  '--foldable-layout-margin-left',
] as const;

const ATTRIBUTES = [
  'data-foldable-posture',
  'data-foldable-size-class',
  'data-foldable-fold',
  'data-foldable-source',
] as const;

/** What an author's CSS sees on <html>: computed custom properties and attributes. */
export function readHtml(): Record<string, string | null> {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return Object.fromEntries([
    ...NAMES.map((n) => [n, style.getPropertyValue(n).trim()]),
    ...ATTRIBUTES.map((a) => [a, root.getAttribute(a)]),
  ]);
}
