export type Attributes = Record<`data-foldable-${string}`, string>;

export function arrangement(o: { style: 'split' }): Attributes {
  return { 'data-foldable-arrangement': o.style };
}
