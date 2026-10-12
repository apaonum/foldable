# CSS reference

The bootstrap (in a Host with a Bridge) or `@foldablejs/core` (once a script calls `getState()` or `subscribe()`) writes these on `<html>`. Both always write every property and attribute below. `primitives.css` reads the author attributes in the second half of this page. For the rules behind each primitive, see the [primitive guide](primitives.md).

All values are CSS px over the layout viewport, with physical edges: `left` and `x` mean the physical left, whatever the `direction`.

## Properties on `<html>`

| Property                                                     | Value                                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--foldable-fold-x`, `-y`, `-width`, `-height`               | The Fold rect, including its 20 px margins on each side. `0px` for all four when the Fold is inactive.                                                        |
| `--foldable-safe-area-top`, `-right`, `-bottom`, `-left`     | Safe-area insets. From a Bridge they are correct at first load, when `env(safe-area-inset-*)` still reads 0 in WKWebView. Without one they come from `env()`. |
| `--foldable-layout-margin-top`, `-right`, `-bottom`, `-left` | Layout margins, safe area included. The native view controller's margins from a Bridge, an approximation otherwise.                                           |

Because the Fold vars read `0px` when there is no Fold, a `calc()` that uses them needs no special case. The vars are viewport-relative, so a box that doesn't start at the viewport origin must subtract its own offset.

```css
body {
  padding-inline: var(--foldable-layout-margin-left, 16px) var(--foldable-layout-margin-right, 16px);
}

.fold-marker {
  position: fixed;
  left: var(--foldable-fold-x);
  top: var(--foldable-fold-y);
  width: var(--foldable-fold-width);
  height: var(--foldable-fold-height);
}
```

The fallback in each `var()` covers a page with no Bridge and no core import, which gets no properties at all. See [Known limits](limits.md).

## Attributes on `<html>`

| Attribute                  | Values                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `data-foldable-posture`    | `book` (the Fold is taller than wide), `tabletop` (wider than tall), or `none` (no active Fold).                    |
| `data-foldable-fold`       | `active` or `inactive`.                                                                                             |
| `data-foldable-size-class` | `compact` or `regular`.                                                                                             |
| `data-foldable-source`     | Where the state came from: `bridge`, `web` (Safari Viewport Segments), or `fallback`. See [Sources](js.md#sources). |

```css
html[data-foldable-fold='inactive'] .fold-marker {
  display: none;
}

html[data-foldable-size-class='compact'] .sidebar {
  display: none;
}
```

## Arrangement attributes

An Arrangement is an element with `data-foldable-arrangement` and two children with `data-foldable-view`. Import the stylesheet once:

```js
import '@foldablejs/core/primitives.css';
```

| Attribute                     | On                | Values                                                                                                                                                                            |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-foldable-arrangement`   | the box           | `split` or `overlay`.                                                                                                                                                             |
| `data-foldable-view`          | each direct child | `primary` or `secondary`.                                                                                                                                                         |
| `data-foldable-axes`          | a Split box       | `horizontal` or `vertical`. Absent means both. Ignored on Overlay.                                                                                                                |
| `data-foldable-overlay-edge`  | an Overlay box    | Space-separated tokens, at most one per axis: `leading` or `trailing`, and `top` or `bottom`. A missing token means that axis's default (`trailing`, `bottom`). Ignored on Split. |
| `data-foldable-overlay-state` | an Overlay box    | `collapsed` (the default when absent) or `expanded`. The stylesheet never changes it.                                                                                             |

| Property                                | On      | Value                                                                                                         |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `--foldable-split-ratio`                | the box | The primary's share of a Split with no Fold, from `0` to `1`. Default `0.5`. Ignored when the Fold is active. |
| `--foldable-arrangement-offset-x`, `-y` | the box | The box's offset from the viewport origin. Default `0px`.                                                     |

The stylesheet sets `container: foldable-arrangement / size`, `position: relative`, and `overflow: hidden` on the box, and absolute positioning on each view. `position` and `overflow` are inside `:where()`, so your own rules override them. You give the box a definite size, for example `height: 100dvh`.

```html
<main data-foldable-arrangement="split" style="height: 100dvh">
  <nav data-foldable-view="primary">Mailboxes</nav>
  <article data-foldable-view="secondary">Message</article>
</main>

<div
  data-foldable-arrangement="overlay"
  data-foldable-overlay-edge="leading"
  data-foldable-overlay-state="collapsed"
  style="height: 100dvh"
>
  <div data-foldable-view="secondary">Map</div>
  <div data-foldable-view="primary">Controls</div>
</div>
```

## Displace attribute

| Attribute                | Values                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-foldable-displace` | Empty for the Posture default (trailing Region in book, bottom Region in tabletop), or tokens: `leading` or `trailing`, and `top` or `bottom`. |

The element gets `position: fixed`, `pointer-events: none`, and `box-sizing: border-box`, sized to the target Region inside the safe area. Put `pointer-events: auto` on the controls inside it.

```html
<div data-foldable-displace>
  <button type="button" style="pointer-events: auto">Reply</button>
</div>
```

## Internal names

Custom properties that start with `--_arrangement-`, `--_overlay-`, or `--_displace-` are private to `primitives.css` and can change in any release. The `__foldablebridgechange` event and the `@foldablejs/core/bootstrap` subpath are internal too.
