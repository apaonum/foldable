# iPhone Duo SwiftUI Q&A forum: what it confirms or contradicts

Research for [#19](https://github.com/Apaonum/foldable/issues/19). Source: Apple Developer Forums activity "iPhone Duo SwiftUI Q&A", threads `https://developer.apple.com/forums/thread/<id>`. Captured 2026-10-12. All threads were about 2 weeks old.

**Capture method:** each thread was fetched with WebFetch, which renders the page to Markdown and passes it through a summarizer that was asked to quote verbatim. Direct `curl` was not available, so the quotes could not be checked against the raw HTML. Treat wording as near-verbatim. Badges are given exactly as the page shows them.

**Attribution key:** **Apple** marks Apple staff, with the badge the page shows (Frameworks Engineer, DTS Engineer, or Technology Evangelist). **Community** marks everyone else.

## Threads

### 847995: Deterministic detection of inner unfolded display vs. outer cover display when flat (180°)

**Question (community, alelabs):** When the device is flat, "ReservedRegion(.division) becomes inactive or reports empty geometries." The poster tells the inner display from the outer one by its safe-area signature: "the presence of the 82 pt top status band versus the trailing lateral cluster on the outer display". They ask whether that is the intended pattern or whether an API exists.

**Reply (Apple, Frameworks Engineer, accepted/recommended):**
> Attempting to deterministically detect the inner or outer display is the wrong approach. There is intentionally no API to determine this.
>
> I'd suggest changing your perspective to think about how to best lay out your app based on the space it has available. Specifically look at size classes and things like the available space for the immediate view you are considering during layout.
>
> […] Thinking about how to generally layout your app with any available space, means you can adapt from iPhone, to iPhone Duo, to iPad, and other devices.
>
> At that point, the code you need to write for iPhone Duo is small. Perhaps adopting an ArrangementView that responds to the hinge, or if you have something more manual needed, using Reserved Regions.

The reply also links the tech talks [111461 "Prepare your app for iPhone Duo"](https://developer.apple.com/videos/play/tech-talks/111461/) and [111463 "Strike a pose with adaptive layouts on iPhone Duo"](https://developer.apple.com/videos/play/tech-talks/111463/). Apple did not comment on the poster's claims about the inactive division or the 82 pt band.

### 848006: How to implement correct horizontal padding for iPhone Duo

**Question (community, Jordan):** "The iPhone Duo outer screen displays a vertical bar on the right edge with view contents inset." A SwiftUI `Form` has leading padding but "0 padding on the trailing edge". `.scenePadding(.horizontal)` adds extra trailing padding on Duo. "When you unfold it and add the app on the left side in Split View, the vertical bar is on the leading edge, in which case there's too much padding on the leading edge." In UIKit, `layoutMarginsGuide` with `preservesSuperviewLayoutMargins` produces the right result.

**Replies:**
- Apple, Technology Evangelist: asked for a Feedback report "describing this missing behavior in SwiftUI".
- Community (Jordan): "FB24914585: Unable to achieve correct horizontal margins/padding insets on iPhone Duo with SwiftUI".
- Apple, Technology Evangelist: thanks.
- Community (Barcode): says the API is `contentMargins(for: .container)`, present in the Xcode 27.1 beta but absent from the 27.2 beta and its docs, and quotes its documentation:
  > This guide vends the system layout margins, which range from 16 to 20 points on iPhone […]. On iPhone Duo, the margin can also be asymmetric, applying different values on each side of the device when next to a vertical bar. Apply or read the guide instead of writing these values into your layout.

  Barcode adds: "Currently using this API causes a crash on the Xcode 27.2 beta 2 simulator."

### 848008: Backporting new SwiftUI views

**Question (community):** Will `ArrangementView` and other new views be backported before iOS 27?

**Reply (Apple, DTS Engineer):**
> Like with any new API, you should use standard availability checking best practices so that you use the new APIs on iOS versions where it is available, and you choose how to best handle the specific situation when the API is not available at runtime.

### 848012: Horizontal Scrolling Beyond Vertical Safe Area

**Question (community, heyri):** "Is it acceptable to have horizontal scrolling below tab view/ toolbar (Vertical Safe Area) on iPhone Duo or should I clipped it?"

**Replies:** none.

### 848014: Handling multi-pass layout updates and debounce strategies during fold/unfold animations

**Question (community, alelabs):** "View bounds, safe areas, and reserved regions frequently resolve across distinct sequential layout passes." Should apps debounce, or does SwiftUI keep view identity across division transitions?

**Reply (Apple, Technology Evangelist):**
> See the post here [848017] for recommendations on alternatives to responding to the hinge and reserved regions directly.
>
> If your use case requires using reserved regions, treat these as inputs to your declarative UI like any other. The layout should be a function of those values. You don't know when a person will pause when re-positioning iPhone Duo, or even change their mind and reverse course. Attempting to anticipate some order of updates would be fighting the framework and a source of bugs.
>
> Guidance around particular layouts and views really depends on the use case, data flow, and the performance characteristics of your app.

### 848015: How to separate/add space between Liquid Glass toolbar items when using ToolbarOverflowMenu

**Question (community, Jordan):** `ToolbarSpacer(.fixed)` doesn't separate a `ToolbarItem` from `ToolbarOverflowMenu`.

**Replies:** Apple (Technology Evangelist) asked for a Feedback report. Jordan filed FB24864715. Apple said it was marked as a duplicate. Native toolbar only, so it has no bearing on the map.

### 848017: Best practice for responding to the hinge angle in SwiftUI: Semantic modifiers vs. ReservedRegion queries

**Question (community, alelabs):** Is posture meant to be modelled only through `GeometryProxy.reservedRegions(kind: .division)`, or is there a semantic posture state? How should apps avoid redundant re-evaluations while the device folds?

**Reply (Apple, Technology Evangelist):**
> There are four basic techniques for responding to the hinge, ranging from easiest to most custom:
>
> 1. Use a standard system component, like `NavigationSplitView` or `UISplitViewController`.
> 2. If that isn't sufficient, investigate whether `ArrangementView` or `UIArrangementViewController` works for your use case.
> 3. If (and only if) neither of those work, consider using the reserved region APIs to position your views. In this case, be careful that the overall size of the views doesn't change. Taking this care should keep the `GeometryReader` or auto-layout system from invalidating the layout again. Test to make sure.
> 4. The `onHingeChange` modifier or the hinge interaction API should not be used for layout decisions.

The reply does not mention any semantic posture API, existing or planned.

### 848023: UIUserInterfaceIdiom for Duo is still ".phone"?

**Reply (Apple, Frameworks Engineer, accepted):**
> iPhone Duo is still `UIUserInterfaceIdiomPhone`.
>
> […] You should audit all the locations in your app using `UIUserInterfaceIdiom` to gate layout or even functionality.
>
> For example, multiple scene instances are supported on iPhone Duo, just like on iPad.

### 848029: Duo not having different z index with overlay arrangement view style

**Question (community, u-dan):** With `.arrangementViewStyle(.overlay)`, the Duo Simulator does not return distinct `overlayArrangementZIndex` values, while other iPhone simulators show 0 and 1.

**Reply (Apple, DTS Engineer, accepted):**
> The behavior you have experienced is due to a known bug. […]
>
> As a workaround […]: `ArrangementView { VStack { Controls() } } secondary: { Player() }`
>
> **Note:** The expected way to check if the controls (primary view) are overlaid on top of the secondary view is to check the `zIndex > 0`.

u-dan filed FB24914700. The page reports 2 replies, but only this one rendered, so a reply may be missing.

### 848043: About wallpaper app for iPhone Duo

**Reply (Apple, DTS Engineer):** links an earlier thread (847768). Wallpaper composition has no bearing on the map.

### 848072: Is the hinge area always un-tappable, or only when the device is folded

**Question (community, jsonstz):** "I noticed the hinge keep out has an isActive status on it. does that mean the hinge area is only un-tappable when it is active? As in, when the device is open 100%, the hinge area can receive taps?"

**Replies:** none.

## The ticket's "Points to check"

| Point | Forum evidence |
|---|---|
| Fold `isActive`, hinge tappable when flat | 848072 has **no replies**. In 847995 a community poster reports that the division is "inactive or reports empty geometries" when flat. Apple did not dispute this, but it is not an Apple statement. |
| Multi-pass layout and debouncing | 848014 (Apple, Technology Evangelist): "The layout should be a function of those values […] Attempting to anticipate some order of updates would be fighting the framework." |
| Posture API, or only `reservedRegions(kind: .division)` | 848017 (Apple, Technology Evangelist) names only system components, ArrangementView, reserved regions, and `onHingeChange`/hinge interaction (not for layout). No posture API is mentioned. |
| Telling inner from outer when flat | 847995 (Apple, Frameworks Engineer): "There is intentionally no API to determine this." Use size classes and available space. |
| Asymmetric safe areas, outer trailing bar | 848006: the bar exists, and it moves to the leading edge in Split View on the inner display (community observation). The asymmetric margin is described in `contentMargins(for: .container)` docs, quoted by the community. Apple only asked for a Feedback report. Nothing says whether the bar is in `safeAreaInsets` or only in layout margins. |
| `overlayArrangementZIndex` on the Simulator | 848029 (Apple, DTS Engineer): a known bug on the Duo Simulator. `zIndex > 0` means the primary is overlaid. |
| Horizontal scrolling in the safe area | 848012 has **no replies**. |

## Impact on the map

### #2 Signals: **confirms**
- No Posture API. 848017 lists the supported techniques, and none is a semantic posture state. The lowest-level layout input is "the reserved region APIs".
- Fold inactive when flat: a community claim in 847995 ("inactive or reports empty geometries"), consistent with #2's header finding that inactive regions are excluded by default. Apple did not answer the tappability question (848072).
- **Adds:** the SwiftUI hinge API is named `onHingeChange`, and Apple says it "should not be used for layout decisions".

### #7 Bridge state: **contradicts in part (posture), adds (safeArea)**
- **`posture` (reopen candidate).** #7 derives `posture` from `UIHingeStatus` plus Fold orientation. Two Apple replies push against exposing a hinge-derived discriminator:
  - 847995 (Frameworks Engineer): "Attempting to deterministically detect the inner or outer display is the wrong approach. There is intentionally no API to determine this."
  - 848017 (Technology Evangelist): "The `onHingeChange` modifier or the hinge interaction API should not be used for layout decisions."

  How the values break down:
  - `book` and `tabletop` come from Fold orientation, so they are reserved-region data and fine.
  - `closed` vs `flat` comes only from hinge status, and in practice it tells the outer display from the inner one, which is the thing Apple says not to do.
  - #9 exposes it as `data-foldable-posture` on `<html>`, so authors can write layout CSS on it.
  - #10's primitives key placement on book and tabletop (derivable from the Fold) and on Fold active/inactive. They don't need `closed`/`flat`.

  The conflict is in the public surface, not the primitives. Options:
  - (a) Drop `closed`/`flat` and derive posture from the Fold alone, for example `book | tabletop | none`.
  - (b) Keep them and document posture as informational, not for layout.
- **`sizeClass`: confirms.** Using the native `horizontalSizeClass` matches 847995: "look at size classes and things like the available space".
- **`safeArea`: adds an open question.** The outer display's vertical bar insets content asymmetrically and moves to the leading edge in Split View (848006). The documented mechanism is system layout margins (`contentMargins(for: .container)`: "the margin can also be asymmetric […] when next to a vertical bar"). This is a community quote of Apple docs. #7 carries `safeAreaInsets` only. A probe is needed to check whether the bar appears in the WKWebView's `safeAreaInsets` or only in `layoutMargins`. If only in margins, web content can't align with native UI next to the bar.
- **Adds:** 848023 (Frameworks Engineer): "multiple scene instances are supported on iPhone Duo, just like on iPad". The Bridge must keep its state per WKWebView, with no process-wide singleton and no idiom gating.

### #8 Delivery: **confirms**
- "Send immediately, no holding, no prediction" matches 848014 (Technology Evangelist): "The layout should be a function of those values. You don't know when a person will pause […] or even change their mind and reverse course. Attempting to anticipate some order of updates would be fighting the framework and a source of bugs."
- The multi-pass resolution of "view bounds, safe areas, and reserved regions" (community, 848014) matches #8's recompute in `layoutSubviews`/`safeAreaInsetsDidChange` with same-run-loop coalescing. Apple did not suggest debouncing.

### #10 Primitives: **confirms, adds a note**
- An Arrangement as a fixed-size app-shell box matches 848017 step 3: "be careful that the overall size of the views doesn't change."
- Overlay expand/collapse and layered detection: 848029 (DTS Engineer) "The expected way to check if the controls (primary view) are overlaid on top of the secondary view is to check the `zIndex > 0`." On the Duo Simulator this value is wrong (known bug), so behaviour on the Simulator can't serve as the reference for Overlay layering. #10's web equivalent (`html[data-foldable-fold="inactive"]` / `fold === null`) doesn't depend on it.
- RTL and Split View: the bar moving to the leading edge in Split View (848006) is another case where leading and trailing insets are not symmetric. This is covered by the `safeArea` item under #7.

### #11 Fallback / Size Class: **confirms, with a GLOSSARY wording issue**
- Using Size Class rather than display identity matches 847995: "There is intentionally no API to determine this."
- **Wording issue:** GLOSSARY defines Size Class as "compact (outer display) or regular (inner display)". On the inner display, Split View (848006) and multiple scenes (848023) can give a compact-width scene, so Size Class is not a display identifier. #10's advice ("Authors who want one view on the outer display … style on `data-foldable-size-class`") repeats the same equation. Suggest rewording to "compact or regular width of the available space". The decision itself stands.
- No debounce in the `web` source: confirmed by the same 848014 quote.

### #13 Test approach: **adds**
- The Duo Simulator has a known bug in `overlayArrangementZIndex` (848029, DTS Engineer). Native ArrangementView behaviour on the Simulator is not ground truth.
- Community report (848006): `contentMargins(for: .container)` "causes a crash on the Xcode 27.2 beta 2 simulator" and is missing from 27.2. This argues for pinning the test Simulator to Xcode 27.1.
- 848017 "Test to make sure": nothing more specific.

### #14 / #15 Keyboard: **no evidence.** No thread mentions the keyboard.

### #16 Accessibility: **no evidence.** No thread mentions focus or VoiceOver. 848006 shows the system flipping leading and trailing insets with Split View position, but that is about layout, not reading order.

### #17 Versioning: **adds a little**
- 848008 (DTS Engineer): "use standard availability checking best practices […] and you choose how to best handle the specific situation when the API is not available at runtime." This applies to the Swift Bridge on iOS earlier than 27.1, where reserved regions and hinge status are absent. The Bridge should still seed a valid snapshot (`fold: null`, `posture: 'unknown'`) behind `#available`. It doesn't address skew between the bootstrap and the core.

## Reopen candidates

1. **#7 `posture`:** `closed`/`flat` are hinge-derived and work as an inner/outer discriminator exposed to CSS, against two Apple statements (847995, 848017). Decide between (a) a Fold-only posture and (b) documenting posture as not for layout.
2. **#7 `safeArea`** (probe first): the bar may live in layout margins, not safe-area insets.
3. **GLOSSARY Size Class** (wording only): remove the outer/inner equation.
