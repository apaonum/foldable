export type Attributes = Record<`data-foldable-${string}`, string>;

export type Edge = { inline?: 'leading' | 'trailing'; block?: 'top' | 'bottom' };

export type SplitOptions = { style: 'split'; axes?: 'horizontal' | 'vertical' };

export type OverlayOptions = {
  style: 'overlay';
  overlayEdge?: Edge;
  overlayState?: 'collapsed' | 'expanded';
};

export type ArrangementOptions = SplitOptions | OverlayOptions;

// One token per axis, space-separated, so the stylesheet can match with `~=`.
function edgeTokens(edge: Edge): string {
  return [edge.inline, edge.block].filter((t) => t !== undefined).join(' ');
}

export function arrangement(options: ArrangementOptions): Attributes {
  const attrs: Attributes = { 'data-foldable-arrangement': options.style };
  switch (options.style) {
    case 'split':
      if (options.axes !== undefined) attrs['data-foldable-axes'] = options.axes;
      return attrs;
    case 'overlay': {
      const tokens = options.overlayEdge === undefined ? '' : edgeTokens(options.overlayEdge);
      if (tokens !== '') attrs['data-foldable-overlay-edge'] = tokens;
      if (options.overlayState !== undefined)
        attrs['data-foldable-overlay-state'] = options.overlayState;
      return attrs;
    }
    default: {
      const _exhaustive: never = options;
      return _exhaustive;
    }
  }
}

export function view(role: 'primary' | 'secondary'): Attributes {
  return { 'data-foldable-view': role };
}

export function displace(edge: Edge = {}): Attributes {
  return { 'data-foldable-displace': edgeTokens(edge) };
}
