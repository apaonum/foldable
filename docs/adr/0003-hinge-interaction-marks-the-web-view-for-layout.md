# A hinge interaction marks the web view for layout on every hinge update

ADR 0002 assumed a Fold change brings a layout pass on the WKWebView itself. On the iPhone Duo Simulator (Xcode 27.1, iOS 27.1) it doesn't: the division region flips in a layout pass of the window's root view, and the web view sits that pass out because its bounds don't change. The swizzled `layoutSubviews` never fires, so a Bridged page kept `fold: null` after launch in book and missed every flat ↔ book toggle on the inner display.

`UIHingeInteraction` updates arrive just before the flip (and stream at ~30 Hz while the angle moves). So `attach(to:)` adds one to the web view on iOS 27.1 and later, and each update calls `setNeedsLayout()` on the web view and schedules a refresh. The web view joins the pass in which the region flips, and the existing `layoutSubviews` hook reads the new Fold. Measured on the Simulator, the read that sees the flip lands within 1 ms of it: launch in book, flat → book, book → flat and book ↔ closed all reported the right Fold.

The swizzle from ADR 0002 stays: it is still the signal for safe-area and geometry changes, and the hinge only makes sure a layout pass reaches the web view.

## Considered Options

- Swizzle `UIView.layoutSubviews` to catch the root view's pass: touches every view in the process.
- Host forwarding from `viewDidLayoutSubviews`: rejected in ADR 0002 for the same reasons.
- Re-read on a timer after each hinge update: guesses at the flip's timing instead of joining its pass.

## Consequences

- The Bridge adds a `UIHingeInteraction` to the Host's web view. A Host that inspects `interactions` sees it.
- Below iOS 27.1 nothing changes; there is no Fold to report.
- Simulator only: confirm on hardware when it ships.
