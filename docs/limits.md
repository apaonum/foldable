# Known limits

These are the cases where foldable v0.1 gives a wrong or missing answer, and what to do about each.

## A CSS-only page without a Bridge gets no state

The bootstrap writes the CSS only in a Host with a Bridge. In Safari, or in a Host without a Bridge, `<html>` has no `--foldable-*` properties and no `data-foldable-*` attributes until a script calls `getState()` or `subscribe()`. Until then:

- `primitives.css` lays out as with no Fold.
- Your own rules on `html[data-foldable-*]` never match.
- Each `var(--foldable-*)` resolves to its fallback.

To get the Size Class, the safe area, and the Viewport Segments Fold in Safari, import `@foldablejs/core` and call `getState()` once, as early as you can:

```ts
import { getState } from '@foldablejs/core';

getState();
```

## The left half of Split View gets 20 px too much leading margin without a Bridge

Without a Bridge, the core approximates layout margins as `max(safeArea, 20)` on the left and the right. That matches native in every captured state except the left app in Split View on the inner display. There, native reports a leading margin of 0 and a trailing margin of 20, and the approximation gives 20 on both sides. With a Bridge the margins come from the Host and are exact.

## Markup that branches on JS state flips once after hydration

The server has no Fold, so the server render and hydration see `SERVER_STATE`. React's `useFoldable()` and Vue's `useFoldable()` then switch to the live state, and anything that branches on it re-renders once. The flip is by design, because it keeps hydration from mismatching.

Put layout in CSS, which the bootstrap or the core writes before the first paint in a Host. Branch on JS state only for markup that can change once without harm, and test for `state === SERVER_STATE` where "not known yet" needs its own rendering.

## Hosts must keep the WKWebView edge-to-edge

The Bridge reports every value in the WKWebView's own coordinate space and assumes that space is the page's layout viewport. Keep the web view edge-to-edge in its owning view controller's view, and set `scrollView.contentInsetAdjustmentBehavior = .never`. Otherwise the Fold, the safe area, and the layout margins are offset from what the page draws. See [Host integration](host.md).

## The `web` Fold in tabletop Posture differs from the Bridge's by Safari's chrome

In Safari with the Viewport Segments flag on, the core takes the Fold from Safari's segments: the line between them, plus 20 px on each side. In tabletop Posture on the inner display, Safari reports the line at y 395.5 in a 669×871 viewport. A Host's Bridge reports the line at 475.5 in a 669×951 web view. The difference of about 80 px is Safari's browser chrome. The core uses the line Safari reports and doesn't correct for the chrome, so in Safari the `web` Fold is `{0, 375.5, 669, 40}` where the Bridge's is `{0, 455.5, 669, 40}`. In book Posture the Fold's x position matches the Bridge's. Only its height differs, because it spans Safari's shorter viewport.

## Other things foldable doesn't do

- **Iframes.** The seed runs in the main frame only. An iframe gets no Bridge state.
- **The keyboard.** There is no keyboard field in the state and no keyboard-aware primitive. See [Recipes](recipes.md#design-forms-for-the-software-keyboard).
- **Focus restoration.** A Split that hides a focused view drops focus to `<body>`. See [Recipes](recipes.md#restore-focus-when-an-arrangement-hides-the-focused-view).
- **The Size Class lag.** After the device unfolds, the native Size Class can change 2 to 4 s after the Fold. `book` with `compact` is a real state for that moment. Split never collapses on Size Class, so it doesn't flash.
- **Outer-display bars.** Apple moves toolbars and tab bars into a column on the trailing side of the outer display. That is app layout. Write it on `data-foldable-size-class`.
- **Hinge state.** There is no `closed` or `flat` value, no hinge angle, and no inner-or-outer display identity. Apple says hinge APIs aren't for layout.
- **Page-to-native messages.** The Bridge only sends state to the page.

## Unverified

All geometry and timings come from the Xcode 27.1 iPhone Duo Simulator. These haven't been checked:

- real hardware
- book Posture combined with Split View, where the Fold is clipped to the window edge
- the layout margins on the inner display in portrait
- the length of the Size Class lag
- whether UIKit mirrors the Fold frame for right-to-left layouts (every probe ran left-to-right)
