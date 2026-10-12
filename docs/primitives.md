# Primitive guide

`primitives.css` has three primitives that follow Apple's ArrangementView and Displacement rules: **Split**, **Overlay**, and **Displace**. They are pure CSS, driven by the `data-foldable-*` attributes in the [CSS reference](css.md). They need no JS, so they work on a page that has only the Bridge's bootstrap. Content without any foldable attribute Spans the Fold untouched. Articles, feeds, and lists need no markup.

```js
import '@foldablejs/core/primitives.css';
```

The examples below assume the inner display of the iPhone Duo Simulator: 951×669 px in landscape, with the book Fold at `{455.5, 0, 40, 669}` and the tabletop Fold (in portrait, 669×951) at `{0, 455.5, 669, 40}`.

## Pick a primitive

- Use **Split** where you'd use an `HStack` or `VStack`, for main and detail views where neither should cover the other.
- Use **Overlay** where you'd use a `ZStack`, for a foreground over a background, such as controls over a map.
- Use **Displace** to move fixed controls, such as a floating action button or a toolbar, off the Fold.
- Do nothing for content that should Span.

Keep navigation containers outside an Arrangement. Don't nest an Arrangement inside a scroller.

## Size the Arrangement box

An Arrangement is an app shell. It fills the viewport along the axis that crosses the Fold, it doesn't scroll, and you give it a definite size. The stylesheet makes it a size container, so a box with no definite height collapses to 0.

```css
.shell {
  height: 100dvh;
}
```

The views are positioned absolutely inside the box. Scroll inside each view, not the box:

```css
.shell > [data-foldable-view] {
  overflow: auto;
}
```

The Fold vars are relative to the viewport. If the box doesn't start at the viewport origin, set its offset so the views still line up with the Fold:

```css
.shell {
  position: fixed;
  inset: 0 0 0 100px;
  --foldable-arrangement-offset-x: 100px;
}
```

The primitives never use the layout margins or the safe area inside an Arrangement. Pad the views yourself, for example with `--foldable-layout-margin-*`.

## Split

| State                         | Layout                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| No Fold, box wider than tall  | Side by side. The primary is leading and takes `--foldable-split-ratio` of the width (default `0.5`). No gutter.                               |
| No Fold, box taller than wide | Stacked. The primary is on top and takes `--foldable-split-ratio` of the height.                                                               |
| Book                          | One view per Region. The primary is in the leading Region, the secondary in the trailing Region. The Fold is the gutter. The ratio is ignored. |
| Tabletop                      | The primary is in the top Region, the secondary in the bottom Region. The Fold is the gutter.                                                  |

At 951×669 with no Fold, the primary and the secondary are each 475.5 wide. In book, the primary is `{0, 0, 455.5, 669}` and the secondary `{495.5, 0, 455.5, 669}`.

An active Fold overrides the aspect ratio. Apple doesn't document this case. foldable puts one view in each Region because content can't sit on the Fold.

### Restrict the axis

Set `data-foldable-axes="horizontal"` or `"vertical"` to allow only one axis. When the axis the Split would use isn't allowed, only the primary is shown:

- With no Fold, the primary fills the box.
- With an active Fold, the primary keeps its Region and doesn't span the Fold, because the Fold is reserved.
- The secondary gets `display: none`. It stays mounted, so its state survives.

```html
<main data-foldable-arrangement="split" data-foldable-axes="horizontal" class="shell">
  <nav data-foldable-view="primary">Mailboxes</nav>
  <article data-foldable-view="secondary">Message</article>
</main>
```

The axis is chosen from the Fold when there is one, otherwise from the box's aspect ratio. `horizontal` means side by side.

### Size Class never collapses a Split

After the device unfolds, the Size Class can change 2 to 4 s after the Fold. A Split that collapsed on `compact` would flash. To show one view on a compact screen, restrict `axes` or write your own rule on `html[data-foldable-size-class='compact']`.

### Split with a clipped Fold

In book Posture with Split View, the Fold can be clipped to the window edge, which leaves the window one Region. The primary then takes that Region, and the secondary gets `display: none` and stays mounted, as when the axis isn't allowed.

## Overlay

Aspect ratio and `data-foldable-axes` don't apply to Overlay.

| State                          | Layout                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| No Fold (layered), `collapsed` | The secondary fills the box. The primary sits on top of it, bottom-aligned, at its intrinsic height.                        |
| No Fold (layered), `expanded`  | The primary fills the box. The secondary gets `visibility: hidden`, which removes it from focus and the accessibility tree. |
| Book (separated)               | One view per Region. The primary is in the trailing Region and fills it.                                                    |
| Tabletop (separated)           | The primary is in the bottom Region and fills it.                                                                           |

To tell layered from separated, read `html[data-foldable-fold='inactive']` in CSS or `getState().fold === null` in JS. There is no extra attribute.

The primary has `z-index: 1` in every state, so it stays on top whatever the DOM order. The primary's height is capped at the box when layered, and at its Region when separated. If its content is taller, scroll inside the primary.

### Expand and collapse

`data-foldable-overlay-state` is yours to set. The stylesheet never changes it, so the state survives Fold changes. A separated Overlay (two Regions) ignores `expanded`. If the attribute is still `expanded` when the Fold goes away, the primary fills the box again.

```html
<div data-foldable-arrangement="overlay" data-foldable-overlay-state="collapsed" class="shell">
  <div data-foldable-view="secondary">Map</div>
  <div data-foldable-view="primary">
    <button type="button" aria-expanded="false">Show details</button>
  </div>
</div>
```

Toggle the attribute and `aria-expanded` together from your click handler.

### Choose the separated edge

Apple has no documented default edge. foldable puts the primary trailing in book and at the bottom in tabletop. `data-foldable-overlay-edge` overrides each axis with one token:

- `leading` or `trailing` sets the side in book.
- `top` or `bottom` sets the side in tabletop.

`data-foldable-overlay-edge="leading"` puts the primary in the leading Region in book and keeps the default (bottom) in tabletop.

### Overlay with a clipped Fold

When the Fold is clipped to the window edge and only one Region is left, the two views layer inside that Region the same way as with no Fold, and `expanded` works as it does with no Fold: the primary fills the Region and the secondary gets `visibility: hidden`.

## Displace

`data-foldable-displace` makes the element a fixed, click-through box over the target Region, inside the safe area:

| State    | Box                                                                             |
| -------- | ------------------------------------------------------------------------------- |
| No Fold  | The whole viewport inside the safe area.                                        |
| Book     | The trailing Region by default, or the leading Region with the `leading` token. |
| Tabletop | The bottom Region by default, or the top Region with the `top` token.           |

The tokens are `leading`, `trailing`, `top`, and `bottom`, at most one per axis. If the target Region doesn't exist because the Fold is clipped to the window edge, the box covers the remaining Region.

The box has `pointer-events: none`, so taps pass through it to the page underneath. Put `pointer-events: auto` on the controls inside, and position them inside the box with ordinary layout:

```html
<div data-foldable-displace class="fab-layer">
  <button type="button" class="fab">Compose</button>
</div>
```

```css
.fab-layer {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px;
}

.fab {
  pointer-events: auto;
}
```

Displace moves fixed positioning only. Absolute and sticky content inside a scroller is Span, and it isn't displaced. Apple also moves bars into a side column on the outer display. That rule is app layout, so write it yourself on `data-foldable-size-class`.

## Order, focus, and accessibility

The primitives never reorder views. They use no `order`, no `*-reverse`, and no `reading-flow`. Placement comes from `data-foldable-view`, so DOM order, focus order, and VoiceOver order stay the same in every Posture. Write the DOM in the order people should read it:

- **Split**: the primary, then the secondary. The primary is leading or on top.
- **Overlay**: the secondary, then the primary. The primary is the foreground, so it comes after the background it covers.
- If you set the Overlay edge to `leading` or `top`, put the primary first instead.

Two cases need your code. When a Split hides its secondary, a focused element inside loses focus to `<body>`. When a layered Overlay is collapsed, the primary covers the bottom of the secondary. [Recipes](recipes.md) has a fix for each.

## Right-to-left

Leading and trailing follow `direction`: the Arrangement box's for Split and Overlay, the element's own for Displace. The Fold rect stays physical, so the stylesheet converts it under `:dir(rtl)`. In RTL book Posture:

- The Split primary is in the right Region.
- The default (trailing) Overlay primary and Displace box are in the left Region.

Tabletop top and bottom don't change with `direction`.

## See the examples

`examples/next` (React, App Router) and `examples/nuxt` (Vue) use every primitive. Their Simulator screenshots come from the release's manual check, in `docs/manual-checks/`.

<!-- SCREENSHOT #39: replace each "pending" cell with an image from docs/manual-checks/v0.1.0/. -->

| Posture                 | `examples/next`          | `examples/nuxt`          |
| ----------------------- | ------------------------ | ------------------------ |
| Outer display, no Fold  | Screenshot pending (#39) | Screenshot pending (#39) |
| Inner display, flat     | Screenshot pending (#39) | Screenshot pending (#39) |
| Inner display, book     | Screenshot pending (#39) | Screenshot pending (#39) |
| Inner display, tabletop | Screenshot pending (#39) | Screenshot pending (#39) |
