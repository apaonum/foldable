# Simulator probe: Posture, Fold, and WKWebView signals

Run 2026-10-10 on Xcode 27.1 RC (27A9275), iOS 27.1 Simulator runtime 24A94232, device `iPhone Duo`. Postures were switched by hand in Device Hub: closed → flat → book → tabletop (rotated) → angle sweep → closed. Probe source: [`simulator-probe/main.m`](simulator-probe/main.m) (Objective-C, no Xcode project; build steps below).

## Findings

### Hinge (`UIHingeInteraction`)

| Posture | `status` | `angle` (rad) |
|---|---|---|
| Closed (outer display) | closed (1) | 0 |
| Flat | fullyOpen (3) | π (3.142) |
| Book / tabletop | partiallyOpen (2) | ~2.23 at rest; 1.33–2.65 seen during a sweep |

- The angle never exceeds π, so **tent is not representable**; no tent control was used.
- On closing, `status` flips to closed at ~1.2 rad, before the angle reaches 0.
- Updates stream at ~30 Hz while the angle changes.

### Fold (`reservedRegionsOfKind:divisionRegionKind`, with `IncludeInactive`)

- **At most one** division region was ever reported.
- Inner display: frame `{455.5, 0, 40, 669}` in landscape (book), `{0, 455.5, 669, 40}` in portrait (tabletop). Margins are 20 pt on the two sides across the Fold, so **the reserved line itself has zero width** and the 40 pt is interactive-content margin.
- Flat: region present with `active=0`. Book/tabletop: `active=1`.
- Outer display: no division region, even with `IncludeInactive`.
- Briefly stale during transitions: right after closing, `safeAreaDidChange` still reported the inner display's region (`active=1`, out-of-bounds frame); the next layout pass reported `[]`.

### Event ordering

1. `hingeUpdate` first.
2. Division `active` flips in the **next `viewDidLayoutSubviews`** (0–200 ms after the hinge update). No other callback reports it, so the layout pass is the Fold-change signal.
3. Size Class trait change follows 2–4 s later (open: compact→regular; close: regular→compact), then `viewWillTransitionToSize` to the other display (outer 466×678 ↔ inner 951×669 / 669×951).
4. `safeAreaInsets` can flip twice during a transition (e.g. `{82,0,34,0}` then `{0,0,34,84}`).

### Occlusion regions

The outer display reports two active occlusion regions near the top-right corner (37×37 and 84×170 in portrait). The inner display reports the same pair rotated. They appear only after the first layout pass.

### Safe area

- Outer, portrait: `{top 0, left 0, bottom 34, right 84}`.
- Inner, landscape: `{0, 0, 34, 84}`.
- Inner, portrait: `{82, 0, 34, 0}`.
- Insets are asymmetric and move with rotation.

### WKWebView (plain `WKWebViewConfiguration`, `viewport-fit=cover`)

- `'devicePosture' in navigator` is **false**. `env(viewport-segment-width 0 0)`, `(horizontal-viewport-segments: 2)` and `(device-posture: folded)` all report nothing.
- `resize` fires on display/rotation changes. **Book ↔ flat fires nothing**, because the viewport size is unchanged. The page can't detect Fold activation on its own.
- `env(safe-area-inset-*)` read `0px` at first load even though native insets were non-zero; it was correct after the first resize.

## Not covered

- Safari with the Device Posture / Viewport Segments feature flags enabled (relevant to the no-Bridge fallback).
- Tent Posture (no control observed).

## Build

```bash
xcrun --sdk iphonesimulator clang -fobjc-arc -target arm64-apple-ios27.1-simulator \
  -isysroot "$(xcrun --sdk iphonesimulator --show-sdk-path)" -framework UIKit -framework WebKit \
  main.m -o FoldProbe.app/FoldProbe   # Info.plist goes in FoldProbe.app/
codesign -s - -f FoldProbe.app && xcrun simctl install booted FoldProbe.app && xcrun simctl launch booted dev.foldable.probe
xcrun simctl spawn booted log stream --style compact --predicate 'eventMessage CONTAINS "FOLDPROBE"'
```
