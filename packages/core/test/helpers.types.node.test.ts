import { expectTypeOf, test } from 'vitest';
import { arrangement, displace, view } from '../src/index';

// Checked by `pnpm typecheck`: each @ts-expect-error fails tsc if the line stops erroring.

test('Split rejects Overlay options', () => {
  // @ts-expect-error overlayEdge is Overlay-only
  arrangement({ style: 'split', overlayEdge: { inline: 'leading' } });
  // @ts-expect-error overlayState is Overlay-only
  arrangement({ style: 'split', overlayState: 'expanded' });
});

test('Overlay rejects axes', () => {
  // @ts-expect-error axes don't apply to Overlay
  arrangement({ style: 'overlay', axes: 'horizontal' });
});

test('values outside the primitives table are rejected', () => {
  // @ts-expect-error unknown style
  arrangement({ style: 'stack' });
  // @ts-expect-error unknown axis
  arrangement({ style: 'split', axes: 'both' });
  // @ts-expect-error block edge on the inline axis
  displace({ inline: 'top' });
  // @ts-expect-error unknown role
  view('tertiary');
});

test('helpers return data-foldable-* attributes', () => {
  expectTypeOf(arrangement).parameter(0).toEqualTypeOf<
    | { style: 'split'; axes?: 'horizontal' | 'vertical' }
    | {
        style: 'overlay';
        overlayEdge?: { inline?: 'leading' | 'trailing'; block?: 'top' | 'bottom' };
        overlayState?: 'collapsed' | 'expanded';
      }
  >();
  expectTypeOf(view).parameter(0).toEqualTypeOf<'primary' | 'secondary'>();
  expectTypeOf(displace)
    .parameter(0)
    .toEqualTypeOf<{ inline?: 'leading' | 'trailing'; block?: 'top' | 'bottom' } | undefined>();
  expectTypeOf(arrangement({ style: 'split' })).toEqualTypeOf<
    Record<`data-foldable-${string}`, string>
  >();
  expectTypeOf(view('primary')).toEqualTypeOf<Record<`data-foldable-${string}`, string>>();
  expectTypeOf(displace()).toEqualTypeOf<Record<`data-foldable-${string}`, string>>();
});
