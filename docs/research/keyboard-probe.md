# Keyboard probe: the software keyboard across the Fold (iOS 27.1 Simulator)

Evidence for [Probe the software keyboard in book and tabletop Posture on the iPhone Duo Simulator](https://github.com/Apaonum/foldable/issues/14). Run 2026-10-11/12.
Terms follow `GLOSSARY.md`. W3C terms appear only when naming web APIs.

## Setup

- Xcode 27.1 RC, iPhone Duo Simulator, hardware keyboard disconnected (I/O › Keyboard). Typing on the Mac reconnects it, after which iOS shows only a 68 pt bar.
- [`keyboard-probe/index.html`](keyboard-probe/index.html): one input near each corner, a fixed bottom bar, and a snapshot on every focus, `resize` and `visualViewport` event (plus a settled snapshot 700 ms later). Served by [`server.py`](keyboard-probe/server.py) on port 8765.
- **WKWebView Host**: [`keyboard-probe/main.m`](keyboard-probe/main.m), an edge-to-edge WKWebView with `contentInsetAdjustmentBehavior = .never` (the decided Host setup). It logs keyboard notifications (end frame in view coordinates), `keyboardLayoutGuide`, the scroll view insets and offset, and the division region into the same log. Build as in the [simulator probe](https://github.com/Apaonum/foldable/blob/research/simulator-probe/docs/research/simulator-probe.md#build), with this `Info.plist` (allows local networking).
- **Safari**: Device Posture and Viewport Segments flags on, `http://localhost:8765/`.
- Raw log: [`keyboard-probe/log.jsonl`](keyboard-probe/log.jsonl) (`src: native | web`, `host: wk | safari`). Screenshots: [tabletop](keyboard-probe/safari-tabletop.png), [book](keyboard-probe/safari-book.png).

## Findings

All values are in pt (native) or CSS px (web); they are equal here.

### Where the keyboard sits

| Posture (inner display) | Native keyboard frame (WKWebView bounds) | Fold reserved frame | Region left visible |
|---|---|---|---|
| Flat, landscape 951×669 | `0,337 951×332` | inactive | top 337 |
| Book, landscape 951×669 | `0,337 951×332` (same as flat) | `455.5,0 40×669` | top 337 of **both** Regions |
| Flat, portrait 669×951 | `0,533 669×418` | inactive | top 533 |
| Tabletop, portrait 669×951 | `0,387.5 669×563.5` | `0,455.5 669×40` | top Region minus 68 |

1. **Book: the keyboard crosses the Fold.** It is one full-width rect at the bottom of both Regions, the same frame as flat. iOS draws it as a split layout, one half per Region with a gap at the Fold ([screenshot](keyboard-probe/safari-book.png)), but no API reports the split: the frame is a single rect.
2. **Tabletop: the keyboard takes the whole bottom Region**, and the 68 pt form accessory bar (↑ ↓ ✓) sits at the bottom of the top Region. Keyboard top = Fold reserved frame top (455.5) − 68 = 387.5. The usable top Region shrinks from 455.5 to 387.5 ([screenshot](keyboard-probe/safari-tabletop.png)).
3. Keyboard height flips between 264 and 332 in landscape (with and without the suggestion bar). Notifications are noisy: one focus produces several `DidShow`/`DidChangeFrame` pairs alternating between the two heights.
4. The outer display was not covered with a full software keyboard. It behaves like an ordinary phone.

### Fold and Posture changes with the keyboard up

5. **The keyboard stays up and focus is kept across Posture changes.** iOS sends a new frame each time.
6. **Fold activation moves the keyboard.** Flat portrait → tabletop goes `0,533 ×418` → `0,455.5 ×495.5` (keyboard top at the Fold) → `0,387.5 ×563.5` (accessory bar added), within about one second of the division region turning active. Book ↔ flat does not change the frame.
7. A rotation between landscape and portrait first hides the keyboard, then shows it again with the new frame.

### What the page sees

| Signal | WKWebView | Safari |
|---|---|---|
| `visualViewport.height` | shrinks to the area above the keyboard (337, 387.5) | shrinks (flat/book 589 → 257; tabletop 871 → 307.5) |
| `innerHeight` | unchanged, **except** while iOS scrolls a covered input into view: it drops to the visible height (337, 388) | unchanged |
| `dvh` / `svh` / `lvh` | unchanged (`dvh` = `svh` = `lvh`) | unchanged (`dvh` = `svh` = 589, `lvh` = 618) |
| `env(keyboard-inset-*)` | not supported | not supported |
| `navigator.virtualKeyboard` | absent | absent |
| `window.viewport.segments` | absent | flat: one segment clipped to the visual viewport (`951×257`); book: two halves at full height, **not** clipped; tabletop: two segments, not clipped |

8. **`visualViewport` is the only web signal for the keyboard**, and it reports only height. It can't tell a split keyboard (book) from a full one, and it doesn't say which Region is covered.
9. **Focusing an input under the keyboard scrolls the page** even when the document doesn't scroll (`html, body { height: 100% }`): WKWebView sets `contentOffset.y` to the keyboard height (332 landscape, 564 tabletop), and fixed elements (the bottom bar) move up with the layout viewport to just above the keyboard. Inputs above the keyboard cause no scroll.
10. WKWebView's `scrollView.adjustedContentInset.bottom` follows the keyboard height despite `.never`, but sometimes reads 0 while the keyboard is up. `keyboardLayoutGuide.layoutFrame` matches the notification end frame and is the steadier native source.

### Size Class

11. The keyboard changes no trait: Size Class changes only when the display switches (outer ↔ inner), not when the keyboard shows.

## Implications for "How do the core and primitives handle the software keyboard across the Fold?"

- A web-only core can learn the keyboard's height (`visualViewport`) but not its shape or which Region it covers. A Host can: `keyboardLayoutGuide` plus the Fold frame.
- In tabletop the keyboard owns the bottom Region outright, so an Arrangement whose primary view is in the bottom Region loses it entirely while typing.
- In book the keyboard covers the bottom of both Regions equally, so per-Region handling isn't needed there.
