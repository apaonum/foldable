# JS reference

`@foldablejs/core` exposes the state as one frozen object. `@foldablejs/react` and `@foldablejs/vue` wrap it in a hook. Layout belongs in CSS (see the [CSS reference](css.md)). Use the JS state for behaviour, for example focus, analytics, or which component to mount.

The packages are ESM only and need Node 20 or later for server rendering.

## `@foldablejs/core`

### `getState()`

```ts
function getState(): State;
```

Returns the current state. On the server, where `window` is undefined, it returns `SERVER_STATE`.

The object is deeply frozen and keeps the same reference until something changes, so `===` comparisons, `useSyncExternalStore`, and `shallowRef` work on it directly.

### `subscribe(listener)`

```ts
function subscribe(listener: (state: State) => void): () => void;
```

Calls `listener` with the new state once for each incoming change that changes the state. The core doesn't merge changes. `subscribe` returns a function that removes the listener. On the server it does nothing and returns a no-op.

```ts
import { getState, subscribe } from '@foldablejs/core';

const state = getState();
console.log(state.posture, state.sizeClass, state.regions.length, state.source);

const unsubscribe = subscribe((next) => {
  console.log('Posture is now', next.posture);
});
// Later, to stop listening:
unsubscribe();
```

### Lifecycle

Importing the core has no side effects. There is no `init()`. The first `getState()` or `subscribe()` call in a browser attaches the core:

1. It picks a source once, and never re-evaluates the choice.
2. It writes its own CSS on `<html>`.
3. It starts listening for changes. On each change it re-writes the CSS, then notifies listeners if the state changed.

The core writes its CSS in the same task as each bootstrap write. Under version skew, the core version on the page owns the CSS.

### Sources

| `source`   | Chosen when                                       | Fold                                    |
| ---------- | ------------------------------------------------- | --------------------------------------- |
| `bridge`   | `window.__foldableBridge` exists with `version` 1 | From the Bridge                         |
| `web`      | else, `window.viewport.segments` exists           | Derived from Safari's Viewport Segments |
| `fallback` | otherwise, or the Bridge has another `version`    | Always `null`                           |

The `web` source exists only in Safari with the **Viewport Segments API** feature flag on. It ignores Device Posture. Its Fold is the line between the two segments, plus 20 px (`FOLD_MARGIN`) on each side, spanning the full viewport height in book or width in tabletop. After a rotation Safari fires `resize` about 1 s before the segments update. While the union width of the segments differs from the viewport width, the core keeps the previous Fold.

`web` and `fallback` compute the rest themselves:

- `sizeClass` is `regular` when `(min-width: 520px) and (min-height: 520px)` matches, else `compact`.
- `safeArea` comes from `env(safe-area-inset-*)`, read from a hidden `aria-hidden` element that the core appends to `<html>`.
- `layoutMargins` is `max(safeArea, 20)` left and right, and `safeArea` top and bottom.

Both recompute on `resize` and on `change` of the Size Class media query, and `web` also on `change` of `(horizontal-viewport-segments: 2)` and `(vertical-viewport-segments: 2)`. Safari fires no `segmentschange` event. Neither source debounces.

### `SERVER_STATE`

```ts
const SERVER_STATE: State;
```

The state before anything is known: on the server and during hydration. Compare by reference to tell "not known yet" from real state:

```ts
import { getState, SERVER_STATE } from '@foldablejs/core';

export function postureLabel(): string {
  const state = getState();
  return state === SERVER_STATE ? 'not known yet' : state.posture;
}
```

| Field           | Value                                   |
| --------------- | --------------------------------------- |
| `posture`       | `'none'`                                |
| `fold`          | `null`                                  |
| `regions`       | `[{ x: 0, y: 0, width: 0, height: 0 }]` |
| `sizeClass`     | `'compact'`                             |
| `safeArea`      | all `0`                                 |
| `layoutMargins` | all `0`                                 |
| `source`        | `'fallback'`                            |

### Types

| Type         | Definition                                                               |
| ------------ | ------------------------------------------------------------------------ |
| `Rect`       | `Readonly<{ x: number; y: number; width: number; height: number }>`      |
| `Insets`     | `Readonly<{ top: number; right: number; bottom: number; left: number }>` |
| `Posture`    | `'book' \| 'tabletop' \| 'none'`                                         |
| `SizeClass`  | `'compact' \| 'regular'`                                                 |
| `Source`     | `'bridge' \| 'web' \| 'fallback'`                                        |
| `State`      | The object below, `Readonly`                                             |
| `Attributes` | ``Record<`data-foldable-${string}`, string>``, returned by the helpers   |

| `State` field   | Type              | Meaning                                                                                                                                                                                                        |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `posture`       | `Posture`         | `none` when `fold` is `null`, `book` when the Fold is taller than wide, else `tabletop`.                                                                                                                       |
| `fold`          | `Rect \| null`    | The Fold, including its 20 px margins. `null` when inactive.                                                                                                                                                   |
| `regions`       | `readonly Rect[]` | The viewport minus the Fold, in physical order (left to right, top to bottom). One Rect with no Fold. One Rect when the Fold is clipped to the window edge, as in book Posture with Split View. Otherwise two. |
| `sizeClass`     | `SizeClass`       | The Host's native `horizontalSizeClass`, or the 520 px rule without a Bridge.                                                                                                                                  |
| `safeArea`      | `Insets`          | Safe-area insets.                                                                                                                                                                                              |
| `layoutMargins` | `Insets`          | Layout margins, safe area included.                                                                                                                                                                            |
| `source`        | `Source`          | See [Sources](#sources).                                                                                                                                                                                       |

`regions` uses `innerWidth` and `innerHeight` as the viewport.

### Helpers

```ts
type Edge = { inline?: 'leading' | 'trailing'; block?: 'top' | 'bottom' };

function arrangement(
  options:
    | { style: 'split'; axes?: 'horizontal' | 'vertical' }
    | { style: 'overlay'; overlayEdge?: Edge; overlayState?: 'collapsed' | 'expanded' },
): Attributes;
function view(role: 'primary' | 'secondary'): Attributes;
function displace(edge?: Edge): Attributes;
```

Each helper returns `data-foldable-*` attributes to spread on your own element. They never return CSS properties, so set `--foldable-split-ratio` and the offsets yourself. The option types reject combinations that do nothing: `axes` on Overlay, and `overlayEdge` or `overlayState` on Split, fail to compile. `Edge` itself isn't exported.

```ts
import { arrangement, displace, view } from '@foldablejs/core';
import type { Attributes } from '@foldablejs/core';

arrangement({ style: 'split', axes: 'horizontal' });
// { 'data-foldable-arrangement': 'split', 'data-foldable-axes': 'horizontal' }
arrangement({ style: 'overlay', overlayEdge: { inline: 'leading', block: 'top' } });
// { 'data-foldable-arrangement': 'overlay', 'data-foldable-overlay-edge': 'leading top' }
arrangement({ style: 'overlay', overlayState: 'expanded' });
// { 'data-foldable-arrangement': 'overlay', 'data-foldable-overlay-state': 'expanded' }
view('primary'); // { 'data-foldable-view': 'primary' }
displace(); // { 'data-foldable-displace': '' }
displace({ block: 'top' }); // { 'data-foldable-displace': 'top' }

export function setAttributes(element: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}
```

### `primitives.css`

`@foldablejs/core/primitives.css` is the stylesheet for the primitives. It needs no JS. Import it from your bundler or link the file from `dist/`.

## `@foldablejs/react`

```ts
function useFoldable(): State;
```

Requires React 18 or later. The entry is marked `'use client'`, so you can import it from the Next.js App Router. The hook is `useSyncExternalStore(subscribe, getState, () => SERVER_STATE)`: the server render and hydration see `SERVER_STATE`, then the component re-renders with the live state. There is no Provider.

```tsx
'use client';

import { arrangement, displace, SERVER_STATE, useFoldable, view } from '@foldablejs/react';

export function MailShell() {
  const state = useFoldable();
  return (
    <>
      <div className="shell" {...arrangement({ style: 'split' })}>
        <nav {...view('primary')} aria-label="Mailboxes">
          {state === SERVER_STATE ? null : <p>Posture: {state.posture}</p>}
        </nav>
        <article {...view('secondary')}>Message</article>
      </div>
      <div {...displace()}>
        <button type="button">Reply</button>
      </div>
    </>
  );
}
```

`examples/next` is a full App Router app.

## `@foldablejs/vue`

```ts
function useFoldable(): Readonly<ShallowRef<State>>;
```

Requires Vue 3.3 or later. The ref starts at `SERVER_STATE`. `onMounted` sets it to `getState()` and subscribes, and `onUnmounted` unsubscribes. Call it in `setup()`. Mounting never happens during SSR, so Nuxt hydration always matches. There is no Nuxt module or plugin.

```ts
import { useFoldable } from '@foldablejs/vue';
import { computed } from 'vue';

export function usePostureLabel() {
  const state = useFoldable();
  return computed(() => `${state.value.posture}, ${state.value.sizeClass}`);
}
```

In a template, `v-bind` takes the helpers' output: `<section v-bind="arrangement({ style: 'split' })">`. `examples/nuxt` is a full Nuxt app.

## Re-exports

Both adapters re-export `SERVER_STATE`, `arrangement`, `view`, `displace`, and the types `Attributes`, `Insets`, `Posture`, `Rect`, `SizeClass`, `Source`, and `State`, so you install one package. They don't re-export `getState` or `subscribe`. To call those directly, add `@foldablejs/core` as a direct dependency too: under pnpm's strict `node_modules`, a package can't import its dependencies' dependencies.
