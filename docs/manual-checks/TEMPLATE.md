# Manual checks: vX.Y.Z

Copy to `docs/manual-checks/vX.Y.Z.md`. Tick each item once it passes in both the example Host and Safari (Develop → Feature Flags: Device Posture API and Viewport Segments API on), unless the item names one. See [README.md](README.md).

## Results

| Date       | Environment  | Xcode / iOS | Commit | Result | Screenshots |
| ---------- | ------------ | ----------- | ------ | ------ | ----------- |
| YYYY-MM-DD | Example Host | 27.1 / 27.1 | `sha`  | pass   | `vX.Y.Z/…`  |
| YYYY-MM-DD | Safari       | 27.1 / 27.1 | `sha`  | pass   | `vX.Y.Z/…`  |

## Posture × display × primitive

Outer display (`--display=primary`), no Fold:

- [ ] Split: axis follows the box's aspect ratio; primary takes `--foldable-split-ratio`
- [ ] Overlay: layered, secondary fills, primary bottom-aligned; `expanded` fills with the primary
- [ ] Displace: covers the viewport inside the safe area, clear of the 84 pt status column

Inner display (`--display=primary-1`), book:

- [ ] Split: one view per Region, the Fold is the gutter; RTL puts the primary in the right Region
- [ ] Overlay: separated, primary in the trailing Region; `data-foldable-overlay-edge` overrides it
- [ ] Displace: controls in the trailing Region, none on the Fold

Inner display, tabletop:

- [ ] Split: primary in the top Region, secondary in the bottom Region
- [ ] Overlay: separated, primary in the bottom Region
- [ ] Displace: controls in the bottom Region, none on the Fold

Inner display, flat (no Posture):

- [ ] Split: no gutter; axis and ratio as on the outer display
- [ ] Overlay: layered, as on the outer display
- [ ] Displace: covers the viewport inside the safe area

## Transitions

- [ ] Book → flat: `data-foldable-fold` becomes `inactive` and layouts reflow with no stale Fold gap
- [ ] Flat → book: the Fold returns and every primitive matches the book checks above
- [ ] Outer ↔ inner display: state follows the display the page is on
- [ ] Size Class lag: during the 2–4 s lag after a change, a Split doesn't collapse or flash; `data-foldable-size-class` settles to the right value

## Integration (example Host only)

- [ ] The seed lands before first paint (no flash of the fallback layout on launch)
- [ ] State survives a reload and a navigation
- [ ] Below iOS 27.1 (e.g. an iOS 17.5 Simulator): the Host builds and runs, the page gets `fold: null` and `data-foldable-fold="inactive"`, and nothing crashes. CI never runs this path
- [ ] Book + Split View with the Fold clipped to the window edge: Split shows only the primary; Overlay layers in the one Region and `expanded` fills it

## Notes

Anything that didn't apply, regressions found and fixed, open issues filed.
