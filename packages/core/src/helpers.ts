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

export function arrangement(o: ArrangementOptions): Attributes {
  const attrs: Attributes = { 'data-foldable-arrangement': o.style };
  switch (o.style) {
    case 'split':
      if (o.axes !== undefined) attrs['data-foldable-axes'] = o.axes;
      return attrs;
    case 'overlay': {
      const tokens = o.overlayEdge === undefined ? '' : edgeTokens(o.overlayEdge);
      if (tokens !== '') attrs['data-foldable-overlay-edge'] = tokens;
      if (o.overlayState !== undefined) attrs['data-foldable-overlay-state'] = o.overlayState;
      return attrs;
    }
    default: {
      const _exhaustive: never = o;
      return _exhaustive;
    }
  }
}

export function view(role: 'primary' | 'secondary'): Attributes {
  return { 'data-foldable-view': role };
}
