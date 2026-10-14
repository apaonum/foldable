# Safari web fold probe (iOS 27.1 Simulator)

Evidence for [What does the core do when no Bridge is present?](https://github.com/Apaonum/foldable/issues/11). Run 2026-10-11.
Terms follow `GLOSSARY.md`. W3C terms appear only when naming web APIs.

## Setup

- Xcode 27.1 RC, iPhone Duo Simulator, Safari (UA `Version/27.0`, `iPhone OS 18_7` frozen).
- Settings › Apps › Safari › Advanced › Feature Flags: **Device Posture API** and **Viewport Segments API** on.
- [`safari-web-probe/index.html`](safari-web-probe/index.html) served from the Mac by [`server.py`](safari-web-probe/server.py) (`python3 -I server.py log.jsonl`, port 8765) and opened at `http://localhost:8765/` (a secure context). Every snapshot is POSTed to the log.
- Sequence: inner display flat → book → tabletop → flat → close to outer → open. Raw log: [`safari-web-probe/log.jsonl`](safari-web-probe/log.jsonl) (row 0 predates the `env()` probe fix and reads `0px` for unsupported values).

## Findings

| Posture | `inner` (CSS px) | `window.viewport.segments` | Segment media queries | `devicePosture.type` |
|---|---|---|---|---|
| Inner, flat | 951×589 | 1: `0,0 951×589` | h:1 v:1 | `continuous` |
| Inner, book | 951×589 | 2: `0,0 475.5×954`, `475.5,0 475.5×954` | h:2 | `folded` |
| Inner, tabletop | 669×871 | 2: `0,0 669×395.5`, `0,395.5 669×558.5` | v:2 | `folded` |
| Outer | 466×498 → 382×580 | 1 | h:1 v:1 | `continuous` |

1. **Viewport Segments works** behind its flag: `window.viewport.segments`, the `horizontal-/vertical-viewport-segments` media features, and `env(viewport-segment-*)` (defined only with 2 segments). No `segmentschange` event fired; the media queries do fire `change`.
2. **Segments abut**: the split is a zero-width line, no gap. Native reports a 40 pt reserved frame (line + 20 pt margins each side).
3. **The line position is correct in layout-viewport px**: book x = 475.5 (half of 951); tabletop y = 395.5 = native 475.5 minus ~80 px of Safari chrome. **Segment extents along the line are not clipped** to the viewport (heights 954 / 1038 against a 589 / 871 viewport).
4. **Stale after rotation**: `resize` fires ~1 s before segments update, so segments briefly describe the previous orientation (total width ≠ viewport width). Brief `continuous` with 2 segments also occurs while unfolding.
5. **Device Posture** is `folded` / `continuous` only; `continuous` on both the outer display and flat, and it flickers through `folded` while closing.
6. **Size Class**: shorter side ≥ 589 on the inner display (with Safari chrome), ≤ 466 on the outer display. Width alone cannot separate outer landscape (678 native) from inner portrait (669 native).
7. **Safe area** via `env()` works in Safari: inner 2/0/34/0, outer all 0.
