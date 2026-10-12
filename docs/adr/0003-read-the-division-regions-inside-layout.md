# Read the division regions inside the web view's layoutSubviews

ADR 0002 assumed a Fold change brings a layout pass on the WKWebView itself. On the iPhone Duo Simulator (Xcode 27.1, iOS 27.1) it doesn't by default: the division region flips in a layout pass of the window's root view, and the web view sits that pass out because its bounds don't change. The deferred refresh read the regions a run-loop turn later, outside any pass, so a Bridged page kept `fold: null` after launch in book and missed flat ↔ book toggles.

So the swizzled `layoutSubviews` reads `reservedRegions(kind: .division)` synchronously, inside the pass, before it schedules the refresh. UIKit then lays the web view out again when a division region flips, the hook fires, and the refresh reads the new Fold. This invalidation isn't documented for `reservedRegions`: the headers promise it only for values such as `cornerConfiguration`. It is observed behavior. On the Simulator, launch in book and 25 flat ↔ book toggles across four builds were all delivered (10 in a row on the final build, counted by `seq`), with no Info.plist opt-in. One earlier 10-click run on the final build pushed nothing (seq stayed at 3, ending on Open, which a run with no registered clicks also shows); 4 fresh launches afterwards each followed every flip in both directions, so that run is attributed to Device Hub, unconfirmed.

## Considered Options

- A `UIHingeInteraction` whose updates mark the web view for layout. Tried first: hinge updates arrive before the flip, and when the flip lands after the last update and the web view's last pass, it's missed. 2 of 6 book → flat toggles stayed stale.
- Swizzle `UIView.layoutSubviews` to catch the root view's pass: touches every view in the process.
- Host forwarding from `viewDidLayoutSubviews`: rejected in ADR 0002 for the same reasons.
- Re-read on a timer: guesses at the flip's timing.
- Refresh synchronously inside `layoutSubviews`: breaks one push per run-loop turn.

## Consequences

- The read only registers the dependency; the refresh still runs once per run-loop turn.
- Below iOS 27.1 nothing changes; there is no Fold to report.
- It rests on undocumented UIKit behavior, so a UIKit change can bring the bug back. The manual check's Book → flat and Flat → book items catch it. Confirm on hardware when it ships.
