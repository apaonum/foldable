# Native Posture and Fold signals in iOS 27.1

Research for [#2](https://github.com/Apaonum/foldable/issues/2). Researched 2026-10-10.

**Question:** Which UIKit/SwiftUI APIs in iOS 27.1 let a Host read and observe Posture, the Fold rect, active Regions, and Size Class on iPhone Duo? For each one: exact names, coordinate space, how updates arrive, and whether a plain `UIViewController` hosting a `WKWebView` can use it.

## TL;DR

| Glossary term | Native source (UIKit) | Coordinate space | How updates arrive | Plain VC + WKWebView? |
|---|---|---|---|---|
| **Fold** | `UIView.reservedRegions(kind: .division)`, returning `[UIView.ReservedRegion]` with `frame`, `margins`, `isActive` | The queried view's coordinate space | Pull only. No change callback is documented. Re-query on layout and on hinge updates (inference) | Yes, it's a `UIView` method |
| **Regions** | Not delivered. Derived: view bounds minus the active `.division` frame (inference) | Same as Fold | Same as Fold | Yes |
| **Posture** | No Posture API. Nearest is `UIHinge` (`status`, `angle` in radians), observed through `UIHingeInteraction` | n/a | Push: the handler fires on every hinge change | Yes, it attaches to any view |
| **Size Class** | `traitCollection.horizontalSizeClass` / `verticalSizeClass` | n/a | `registerForTraitChanges` | Yes |
| (extra) Vertical bar edge | `UITraitCollection.verticalBarEdge` | n/a | Trait change via `systemTraitsAffectingVerticalBarEdge` | Yes |
| (extra) Camera occlusion | `reservedRegions(kind: .occlusion)` | Queried view | Same as Fold | Yes |

`UIArrangementViewController` is **not** required for any of these signals. Every API above lives on `UIView`, on `UITraitCollection`, or on an interaction you can attach to any view.

## Source caveats

- All 27.1 symbols below are marked **Beta** on developer.apple.com.
- The local toolchain is Xcode with the **iOS 27.0 SDK** (`xcrun --sdk iphoneos --show-sdk-version` → `27.0`). A grep of its UIKit headers finds none of `ReservedRegion`, `HingeInteraction`, or `ArrangementViewController`. So nothing here was checked against 27.1 headers. Everything comes from Apple's documentation JSON, Tech Talks, and DTS forum answers.
- Apple's written guide "Preparing your app for iPhone Duo" is still listed as "Coming soon" on <https://developer.apple.com/iphone-duo/>.

## Verified facts (primary sources)

### Fold: reserved regions

- `UIView.ReservedRegion` (ObjC `UIViewReservedRegion`): "A region within a view's coordinate space that another entity occupies." Available from iOS 27.1 (beta). Conforms to `Equatable`, `Hashable`, `Identifiable`. [doc](https://developer.apple.com/documentation/uikit/uiview/reservedregion)
  - `frame: CGRect`: "The rectangle of the region in the view's coordinate space, including the margins."
  - `margins: UIEdgeInsets`: "The margins included in the frame around the reserved region for interactive content."
  - `isActive: Bool`, `kind: UIView.ReservedRegion.Kind`, plus an identifier (ObjC `UIViewReservedRegionIdentifier`). [ObjC doc](https://developer.apple.com/documentation/uikit/uiviewreservedregion)
  - `Kind.division`: "A region where content splits into two separate regions." `Kind.occlusion`: "A region where an element, such as a camera, occludes content."
- Query method: `func reservedRegions(kind: UIView.ReservedRegion.Kind, options: UIView.ReservedRegion.QueryOptions = []) -> [UIView.ReservedRegion]`, `@MainActor`, iOS 27.1 (beta). [doc](https://developer.apple.com/documentation/uikit/uiview/reservedregions(kind:options:))
- `QueryOptions.includeInactive`: "whether inactive reserved regions are included in a query result." [doc](https://developer.apple.com/documentation/uikit/uiview/reservedregion/queryoptions)
- Fold semantics from Tech Talk 111463, "Strike a pose with adaptive layouts on iPhone Duo": the Fold "is backed by a division reserved region". It is "only active when someone has folded the device. When flat, it's inactive and has a width of zero." The camera on the inner display is an occlusion region that is "active when the camera is active." [talk](https://developer.apple.com/videos/play/tech-talks/111463/)
- **Sources conflict on default filtering.** The `ReservedRegion` overview says the method "returns all of the reserved regions that currently intersect your view regardless of whether they are currently active". Tech Talk 111463 says "By default, only active ones will be returned", and the `includeInactive` option only makes sense if that is true. Either way, filtering on `isActive` is safe.
- The HIG lists three reserved regions on iPhone Duo: the outer front camera ("always present"), the inner front camera ("only present when the camera is active"), and "the folding region", which is "conditional based on how a person uses the device." [HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)

### Posture: hinge state (no Posture type exists)

- `UIHingeInteraction` (`@MainActor`, a `UIInteraction`, iOS 27.1 beta): "An interaction for observing the hinge state associated with the view's hierarchy." Created with `init(updateHandler:)`. Has `isEnabled`. "The interaction's handler is called when the hinge state changes, or when the interaction moves between hierarchies." [doc](https://developer.apple.com/documentation/uikit/uihingeinteraction)
- `UIHingeInteraction.Update.hinge: UIHinge?` is `nil` "when the interaction leaves a hierarchy that provides hinge updates." [doc](https://developer.apple.com/documentation/uikit/uihingeinteraction/update)
- `UIHinge`: `angle: CGFloat` ("The current angle of the hinge, in radians") and `status: UIHinge.Status`. [doc](https://developer.apple.com/documentation/uikit/uihinge)
- `UIHinge.Status` (ObjC `UIHingeStatus`) has four cases: `closed`, `partiallyOpen`, `fullyOpen` ("open as far as the device allows"), and `unknown`. [doc](https://developer.apple.com/documentation/uikit/uihinge/status-swift.enum)
- The SwiftUI equivalent is `onHingeChange(isEnabled:_:)` with `(DeviceHingeContext, DeviceHingeContext) -> Void` (old, new), and `context.hinge: DeviceHinge?`. [doc](https://developer.apple.com/documentation/swiftui/view/onhingechange(isenabled:_:))
- Apple positions hinge data for effects, not layout. Tech Talk 111464, "Leverage multiple displays and scenes on iPhone Duo", says hinge data "is observed live, and is ideal for driving interactions or effects", and that layout should use "the arrangement and region APIs". [talk](https://developer.apple.com/videos/play/tech-talks/111464/)
- The HIG describes poses only in prose: "partially folded like a book, placed down on a surface, or standing on its edges." No API names book, flat, or tent. [HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)

### Size Class

- The outer display behaves like other iPhones: compact width with regular height in portrait, and compact/compact in landscape. The inner display is regular/regular. "The inner display doesn't honor your supported interface orientations." Apple's guidance is to use `traitCollection.horizontalSizeClass` / `verticalSizeClass` rather than idiom or orientation. Source: Tech Talk 111461, "Prepare your app for iPhone Duo". [talk](https://developer.apple.com/videos/play/tech-talks/111461/)
- Safe areas are "often asymmetric" on iPhone Duo, so handle each side independently (111461).

### Observation

- No reserved-region change callback, notification, or trait is documented. A DTS engineer answered "How to know when active regions are changing?" by pointing to (a) querying `reservedRegions(kind:options:)`, (b) UIKit's automatic observation tracking, and (c) `UIHingeInteraction`. The answer did not address the follow-ups about `registerForTraitChanges` or KVO. [forum](https://developer.apple.com/forums/thread/847876)
- UIKit automatic observation tracking covers `layoutSubviews()`, `updateProperties()`, and similar methods for **`Observable` properties you read**. The page says nothing about reserved regions or the hinge. [doc](https://developer.apple.com/documentation/uikit/updating-views-automatically-with-observation-tracking-in-uikit)
- The vertical bar edge is observable as a trait: "Read the edge where the system places controls on the vertical axis using `verticalBarEdge` ... Register for changes to it using the traits from `systemTraitsAffectingVerticalBarEdge`." [UIKit updates](https://developer.apple.com/documentation/updates/uikit)

### SDK behaviour

- Tech Talk 111461 describes three tiers:
  - Any SDK: the app runs on iPhone Duo.
  - iOS 27 SDK: the app "will extend to the left of the status bar area on the inner display".
  - iOS 27.1 SDK: the app "extends to the edge of the screen", and bars lay out vertically.

### Web side

- No Apple primary source (Safari 27 or 27.2 beta release notes, WebKit docs) mentions iPhone Duo, `viewport-segments`, or `device-posture`. [Safari release notes](https://developer.apple.com/documentation/safari-release-notes)

## Inference (not stated by Apple)

1. **Fold rect for the Bridge:** take the `frame` of the active `.division` region, queried on the `WKWebView` itself so it is already in web-view coordinates. `frame` includes `margins`, so it is the no-interactive zone, which matches the glossary's Fold. When flat, report a zero-width Fold (or none).
2. **Regions:** split the web view's bounds by the Fold frame, along the Fold's long axis.
3. **Posture:** map hinge status to Posture: `closed` → closed (outer display), `partiallyOpen` → book, `fullyOpen` → flat. *Tent* cannot be told apart from book using hinge status alone. It would need angle thresholds plus device orientation or motion data, which may not be worth it for v0.1.
4. **When to re-query:** in `viewDidLayoutSubviews` (or the web view's `layoutSubviews`), and in the `UIHingeInteraction` handler, because a Fold activating may not change bounds. Hinge updates are continuous while folding, so the Bridge should coalesce them, e.g. send only when the Fold rect, Posture, or Size Class actually changes.
5. **Points to CSS px:** at default zoom, UIKit points in the web view's coordinate space equal CSS px. Adjust for `scrollView.zoomScale`, `contentInset`, and `obscuredContentInsets` (Safari 26) if the Host uses them.
6. The Bridge should probably also report `verticalBarEdge`, because the web layer owns safe-area handling edge-to-edge (map #1 standing decision).

## Open unknowns

- Does `reservedRegions` return only active regions by default? The docs conflict. Confirm in 27.1 headers or the Simulator.
- Which lifecycle event fires when a `.division` region activates or deactivates? Is `layoutSubviews` called? Is `ReservedRegion` observable? Verify in the Xcode 27.1 Simulator with Device Hub fold controls.
- The range and zero point of `UIHinge.angle` are undocumented. Is closed 0 rad, and is flat π?
- Is the Fold always vertical in book Posture, and can more than one `.division` region exist (e.g. in Split View multitasking)?
- What do `UIHinge.status` and `reservedRegions` report while the app is on the outer display, in Split View, or in a stacked layout? Is `update.hinge` nil there?
- Does WebKit in iOS 27.1 ship `viewport-segments` / `device-posture`? Only secondary sources discuss this, and they conflict: some report it behind feature flags in the Simulator, others say it is not supported. Relevant to the no-Bridge fallback.
- Whether any of these symbol names change before 27.1 leaves beta. Building the Bridge needs Xcode 27.1, because the 27.0 SDK lacks all of these symbols.
