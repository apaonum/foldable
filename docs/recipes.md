# Recipes

Each recipe solves one problem the primitives leave to you. The TypeScript in this page is compiled by `pnpm typecheck` (see `docs/samples/`).

## Restore focus when an Arrangement hides the focused view

When a Split hides its secondary with `display: none`, for example after a rotation into a box where the axis isn't allowed or when the Fold is clipped to the window edge, a focused element inside it loses focus. An expanded Overlay does the same with `visibility: hidden` when the Fold goes away. Focus moves to `<body>`, and a keyboard or VoiceOver user loses their place. foldable has no built-in fix.

To restore focus, remember the last focused element and check it on every state change and every resize:

```ts
import { subscribe } from '@foldablejs/core';

/** Moves focus to `fallback` when an Arrangement change hides the last focused element. */
export function restoreFocus(fallback: HTMLElement): () => void {
  let last: Element | null = null;
  const remember = (event: FocusEvent): void => {
    if (event.target instanceof Element) last = event.target;
  };
  const check = (): void => {
    if (last !== null && last.isConnected && !last.checkVisibility({ visibilityProperty: true })) {
      last = null;
      fallback.focus();
    }
  };
  document.addEventListener('focusin', remember);
  // The box can change aspect ratio with no state change, so check on resize too.
  window.addEventListener('resize', check);
  const unsubscribe = subscribe(check);
  return () => {
    document.removeEventListener('focusin', remember);
    window.removeEventListener('resize', check);
    unsubscribe();
  };
}
```

Pass the element that should take focus, for example the primary view's heading with `tabindex="-1"`. With `visibilityProperty: true`, `checkVisibility()` returns `false` for an element inside a `display: none` subtree and for an element with `visibility: hidden`. The recipe checks only the last element that received focus.

## Keep focused content clear of a collapsed Overlay

In a layered, collapsed Overlay, the primary covers the bottom of the secondary. If the secondary scrolls, a focused element can scroll under the primary. Pad the secondary's scroll area by the primary's height, but only while the Overlay is layered:

```css
html:not([data-foldable-fold='active'])
  [data-foldable-arrangement='overlay']:not([data-foldable-overlay-state='expanded'])
  > [data-foldable-view='secondary'] {
  overflow: auto;
  scroll-padding-block-end: var(--primary-height, 0px);
  padding-block-end: var(--primary-height, 0px);
}
```

`scroll-padding-block-end` keeps focused and scrolled-to elements above the primary. `padding-block-end` lets the last item scroll clear of it. The primary has an intrinsic height. If it's fixed, set `--primary-height` in CSS. Otherwise publish it with a `ResizeObserver`:

```ts
/** Publishes the primary's height as `--primary-height` on the Overlay box. */
export function trackPrimaryHeight(overlay: HTMLElement): () => void {
  const primary = overlay.querySelector('[data-foldable-view="primary"]');
  if (primary === null) return () => undefined;
  const observer = new ResizeObserver(([entry]) => {
    const height = entry?.borderBoxSize[0]?.blockSize ?? 0;
    overlay.style.setProperty('--primary-height', `${height}px`);
  });
  observer.observe(primary);
  return () => {
    observer.disconnect();
  };
}
```

## Design forms for the software keyboard

In book Posture the software keyboard crosses the Fold, and no API reports the split shape iOS draws. foldable has no keyboard state and no keyboard-aware primitive. These are the frames measured on the iPhone Duo Simulator:

| Posture                   | Keyboard rect, in WKWebView px                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Flat, landscape (951×669) | `{0, 337, 951, 332}`                                                                                                                |
| Book (951×669)            | `{0, 337, 951, 332}`, the same as flat. iOS draws the keyboard split, one half per Region, but reports one full-width rect.         |
| Flat, portrait (669×951)  | `{0, 533, 669, 418}`                                                                                                                |
| Tabletop (669×951)        | `{0, 387.5, 669, 563.5}`: the whole bottom Region, plus a 68 px accessory bar at the bottom of the top Region (455.5 − 68 = 387.5). |

The keyboard height also switches between 264 and 332 in landscape, with and without the suggestion bar. The keyboard stays up across Posture changes. When the Fold activates in portrait, it moves up to 387.5 within about one second.

When you design a form:

- In book Posture, the keyboard covers the bottom of both Regions. Keep fields in the top half of each Region.
- In tabletop Posture, the bottom Region is all keyboard while typing. Put the fields and the submit button in the top Region, above 387.5 px. The Split primary is already there. A separated Overlay primary is in the bottom Region by default, so it disappears under the keyboard. Set `data-foldable-overlay-edge="top"` on Overlays that hold fields.
- Focusing a field under the keyboard makes WKWebView scroll the page, even a page that doesn't scroll, and fixed elements move up with it.

## Read the keyboard inset

The only web signal for the keyboard is `visualViewport`. The part of the layout viewport the keyboard covers is `innerHeight - visualViewport.height - visualViewport.offsetTop`:

```ts
/** The part of the layout viewport the software keyboard covers, in CSS px. */
export function keyboardInset(): number {
  const vv = window.visualViewport;
  if (vv === null) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

const publish = (): void => {
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset()}px`);
};
window.visualViewport?.addEventListener('resize', publish);
window.visualViewport?.addEventListener('scroll', publish);
```

Then lift a bottom toolbar above the keyboard with `bottom: var(--keyboard-inset, 0px)`. The inset is 332 in book and flat landscape, and 563.5 in tabletop, where it includes the accessory bar. `visualViewport` reports only a height. It can't tell a split keyboard from a full one or say which Region the keyboard covers. Neither WKWebView nor Safari supports `env(keyboard-inset-*)` or `navigator.virtualKeyboard`.
