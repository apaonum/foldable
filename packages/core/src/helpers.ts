export type Attributes = Record<`data-foldable-${string}`, string>;

export type SplitOptions = { style: 'split'; axes?: 'horizontal' | 'vertical' };

export function arrangement(o: SplitOptions): Attributes {
  const attrs: Attributes = { 'data-foldable-arrangement': o.style };
  if (o.axes !== undefined) attrs['data-foldable-axes'] = o.axes;
  return attrs;
}
