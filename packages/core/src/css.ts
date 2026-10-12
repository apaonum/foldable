import type { Insets, State } from './types';

/** Everything toCSS reads; `regions` is left out so the bootstrap needn't derive it. */
export type CSSInput = Pick<
  State,
  'posture' | 'fold' | 'sizeClass' | 'safeArea' | 'layoutMargins' | 'source'
>;

export type CSS = Readonly<{
  properties: Readonly<Record<`--foldable-${string}`, string>>;
  attributes: Readonly<Record<`data-foldable-${string}`, string>>;
}>;

const px = (n: number): string => `${n}px`;

function insets(prefix: string, i: Insets): Record<`--foldable-${string}`, string> {
  return {
    [`--foldable-${prefix}-top`]: px(i.top),
    [`--foldable-${prefix}-right`]: px(i.right),
    [`--foldable-${prefix}-bottom`]: px(i.bottom),
    [`--foldable-${prefix}-left`]: px(i.left),
  };
}

export function toCSS(state: CSSInput): CSS {
  const fold = state.fold ?? { x: 0, y: 0, width: 0, height: 0 };
  return {
    properties: {
      '--foldable-fold-x': px(fold.x),
      '--foldable-fold-y': px(fold.y),
      '--foldable-fold-width': px(fold.width),
      '--foldable-fold-height': px(fold.height),
      ...insets('safe-area', state.safeArea),
      ...insets('layout-margin', state.layoutMargins),
    },
    attributes: {
      'data-foldable-posture': state.posture,
      'data-foldable-size-class': state.sizeClass,
      'data-foldable-fold': state.fold === null ? 'inactive' : 'active',
      'data-foldable-source': state.source,
    },
  };
}

/** Overwrites every foldable property and attribute; never removes anything. */
export function applyCSS(css: CSS, root: HTMLElement): void {
  for (const [name, value] of Object.entries(css.properties)) root.style.setProperty(name, value);
  for (const [name, value] of Object.entries(css.attributes)) root.setAttribute(name, value);
}
