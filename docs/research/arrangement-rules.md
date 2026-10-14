# Arrangement rules: Split, Overlay, Displacement

Research for [#4](https://github.com/Apaonum/foldable/issues/4). Target: iOS 27.1, iPhone Duo. Researched 2026-10-10.

Terms follow `GLOSSARY.md`. Apple calls Regions "reserved regions" and calls Postures "poses". The Fold is a reserved region of kind `division`.

## TL;DR

1. **Split and Overlay are not chosen automatically.** The developer picks the style. The default style, `.automatic`, always resolves to Split. The glossary entry for **Arrangement** and the ticket's question both assume an automatic choice, and that assumption is wrong. See [Glossary impact](#glossary-impact).
2. Within the style the developer picks, Apple's code adapts automatically:
   - **Split** picks its axis from the aspect ratio. Horizontal when the arrangement is wider than tall, vertical when taller.
   - **Overlay** layers the primary view over the secondary view. When the device folds, it puts the two views side by side.
3. **Inputs** to an Arrangement: horizontal and vertical Size Class, aspect ratio (width/height), and whether any division region (the Fold) is active. **Outputs** for each view: whether it is hidden, its frame, its split axis, and its z-index.
4. **Displacement** depends on the Posture:
   - Book: alerts move to the trailing Region.
   - Tabletop: content you look at goes on top, controls go on the bottom.
   - Outer display: bars move into a column on the right side.
   - Content that scrolls continuously (Span) is never displaced.
5. **There is no "sidebar on the outer display".** On the outer display, toolbars and tab bars move into a side column. Turning the tab bar into a sidebar is an option on the inner display only.

## Sources

| Key | Source | Kind |
|---|---|---|
| HIG | [Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo) | Primary, read verbatim[^json] |
| AV | [SwiftUI `ArrangementView`](https://developer.apple.com/documentation/swiftui/arrangementview) | Primary, read verbatim |
| AUTO | [SwiftUI `AutomaticArrangementViewStyle`](https://developer.apple.com/documentation/swiftui/automaticarrangementviewstyle) | Primary, read verbatim |
| OVS / SVS | [`OverlayArrangementViewStyle`](https://developer.apple.com/documentation/swiftui/overlayarrangementviewstyle), [`SplitArrangementViewStyle`](https://developer.apple.com/documentation/swiftui/splitarrangementviewstyle) | Primary, abstracts only |
| EDGE | [`View.overlayArrangementEdge(_:)`](https://developer.apple.com/documentation/swiftui/view/overlayarrangementedge(_:)) | Primary, read verbatim |
| ZIDX | [`EnvironmentValues.overlayArrangementZIndex`](https://developer.apple.com/documentation/swiftui/environmentvalues/overlayarrangementzindex) | Primary, read verbatim |
| UAVC | [UIKit `UIArrangementViewController`](https://developer.apple.com/documentation/uikit/uiarrangementviewcontroller) | Primary, read verbatim |
| VS | [`UIArrangementViewController.ViewState`](https://developer.apple.com/documentation/uikit/uiarrangementviewcontroller/viewstate) | Primary, read verbatim |
| RR | [SwiftUI `ReservedRegion`](https://developer.apple.com/documentation/swiftui/reservedregion) | Primary, read verbatim |
| TT-POSE | [Tech Talk 111463 "Strike a pose with adaptive layouts on iPhone Duo"](https://developer.apple.com/videos/play/tech-talks/111463/) | Primary. Transcript read through a summarizer, so content is **paraphrased**, with chapter-level timestamps only |
| TT-DESIGN | [Tech Talk 111466 "Design for iPhone Duo"](https://developer.apple.com/videos/play/tech-talks/111466/) | Primary. **Paraphrased**, chapter-level timestamps only |
| BC | [Blake Crosley, "Designing for iPhone Duo"](https://blakecrosley.com/blog/designing-for-iphone-duo) | Secondary. Used only to cross-check; no claim below depends on it alone |

[^json]: The HIG and API pages are rendered with JavaScript. I read them from the DocC JSON at `developer.apple.com/tutorials/data/<path>.json`, for example `.../design/human-interface-guidelines/designing-for-iphone-duo.json`.

## Verified facts

### F1. The developer chooses the style; the default resolves to Split

- AV: the developer chooses the style with `arrangementViewStyle(_:)`. "The default style is `AutomaticArrangementViewStyle`, which resolves to a split arrangement." The other built-in styles are `.overlay` and `.split`.
- AUTO: "Using this style, the arrangement view resolves to a `SplitArrangementViewStyle`." The page gives no condition under which it resolves to anything else.
- UAVC: the style is set with `updateArrangement(_:animated:)`. "The default style is `UISplitArrangement`. The other built-in style is `UIOverlayArrangement`."
- TT-POSE (paraphrased, chapters "Configure the split arrangement" and "Use the overlay arrangement"): Split is the default. Nothing in the talk switches automatically between Split and Overlay.

### F2. Inputs and outputs

- AV and UAVC: the layout is computed "based on the context it is presented in, including the available size, size class, and hardware features."
- TT-POSE (paraphrased, chapter "Introducing arrangements", about 9:20): inputs are the horizontal and vertical Size Class, the aspect ratio (width/height), and whether any division region is active. Outputs are whether each view is shown and its frame.
- VS: the per-view state exposes `isHidden: Bool`, `splitAxis: UIAxis` ("the axis of the current split ... if it exists"), and `zIndex: Int`. You read it with `state(for: .primary | .secondary)`.

### F3. Split

- HIG: "A split arrangement divides its area between its primary and secondary views. It splits horizontally when the arrangement is wider than it is tall, and splits vertically when the arrangement is taller than it is wide."
- HIG diagram alt text: the primary view fills the leading half and the secondary view fills the trailing half. So in a horizontal Split, **primary is leading and secondary is trailing**.
- AV: the split "adapts its axis based on the available size and size class." `axes(_:)` restricts which axes it may use.
- TT-POSE (paraphrased, chapters "Configure the split arrangement" and "Restrict the split to one axis", about 12:00 to 12:41): if the split cannot divide along its primary axis, it shows a single view. The example uses `.split.axes(.horizontal)` in a view taller than wide, and only the **primary** view (`PlayerView`) is shown.
- Sizing modifiers exist: `splitArrangementLayoutRatio(_:)`, `splitArrangementLayoutRatio(min/ideal/max...)`, `splitArrangementLayoutSize(...)`, and `splitArrangementFixedLayoutSize(horizontal:vertical:)` (AV). On the fixed-size modifier, AV says the arrangement "may resize to a smaller size depending on the priority of the view."

### F4. Overlay

- AV and UAVC: the overlay "layers the primary view on top of the secondary view in z-order. ... When the environment changes, such as when a foldable device is folded, the overlay arrangement can transition its views from a layered layout into a side-by-side layout." `axes(_:)` controls which axes are allowed.
- HIG: "When the display is partially folded, the views move to occupy each side; otherwise the primary view moves atop the secondary view." The diagram alt text has the secondary view filling the display, with a smaller, bottom-aligned primary view on top of it.
- TT-POSE (paraphrased, chapter "Use the overlay arrangement", about 13:21): the overlay prefers stacking above and below. When folded, it prefers side by side.
- EDGE: `overlayArrangementEdge(_ edge: HorizontalEdge?)` sets the horizontal edge a view takes "when the arrangement transitions to a horizontal layout." The documented example puts the controls on `.trailing`.
- ZIDX: views can read `@Environment(\.overlayArrangementZIndex)`. A higher value draws on top. TT-POSE uses it to switch a view between collapsed and expanded. This is the "collapse the secondary view" pattern the HIG mentions.
- HIG: use Split where you would use an `HStack` or `VStack`, and Overlay where you would use a `ZStack`. TT-POSE adds: use Overlay for a foreground/background relationship, and Split for main/detail where neither view should be covered.
- HIG and TT-POSE: put navigation containers outside an ArrangementView. TT-POSE also says not to put an ArrangementView inside a `List` or `ScrollView`.

### F5. Regions (reserved regions)

- RR: there are two kinds of reserved region. `occlusion` covers cameras and the Dynamic Island. `division` is "an area where content splits into separate regions, such as at the fold of a hinge." Each region has `id`, `frame` (including margins), `isActive`, `kind`, and `margins`. `frame` is mirrored for right-to-left layouts by default; `.fixed` turns that off.
- TT-POSE (paraphrased): inactive regions are left out by default; `.includeInactive` includes them. The Fold's division region has zero width when the device is flat. UIKit has `view.reservedRegions(kind:)`.
- HIG: the reserved regions on iPhone Duo are the outer camera (always present), the inner camera (only while the camera is active), and the folding region (only when the device is partially open).

### F6. Displacement

Apple does not use "displacement" as a term in the HIG body text. It is the term used in TT-POSE.

- TT-POSE (paraphrased, chapter "Displacement patterns", about 2:26): Displacement changes the frame of existing elements to fit the available space. It can apply to one button or a whole container. Move an element alone if it can adapt alone, and move related elements together. Avoid moving anything far from where it was. **Content that scrolls continuously (articles, feeds, documents, lists) is not displaced.** This matches the glossary's **Span**.
- HIG: "Move only what's necessary to keep elements visible and easy to tap. ... favor small adjustments over rearrangement." For custom elements the system does not move, use `ReservedRegion`. In grids, prefer an even number of columns.
- HIG on Span: layouts that do not scroll can span the whole display (Calculator is the example) as long as nothing conflicts with the Dynamic Island or status bar. A background can span while scrolling content stays inset.

Rules by Posture:

| Posture | Rule | Source |
|---|---|---|
| Book (partially folded) | Alerts move to the **trailing** Region, nearer to where they appear when the device closes. | TT-POSE, chapter "Choose where content moves" (about 4:00), paraphrased |
| Book, portrait | Interactive elements move to the bottom half. | TT-DESIGN, paraphrased |
| Tabletop | The top Region is for content viewed from a distance, such as alerts. The bottom Region is for touch controls, such as media controls. This layout is optional and must keep the same controls and hierarchy. | TT-POSE (about 4:00) and TT-DESIGN, paraphrased |
| Any partial fold | Alerts, context menus, sheets, action sheets, popovers, and toolbar buttons move away from the Fold automatically. Sheets slide off the Fold. | HIG (verbatim for alerts, context menus, and sheets); TT-POSE and TT-DESIGN (paraphrased) for the rest |
| Closed (outer display) | Toolbars, tab bars, and navigation controls move from the top and bottom **to the side** to save vertical space. The side is the **right** side, for right-thumb reach. | HIG (to the side, verbatim); TT-DESIGN (right side, paraphrased) |
| Inner display, portrait | Keeps standard horizontal bars. | HIG, verbatim |
| Inner display | The tab bar can be shown as a **sidebar**, which suits information-dense apps (Health is the example). | TT-DESIGN, paraphrased (about 7:34) |

More bar rules from the HIG:
- Primary navigation (Back or Close) goes at the top of the vertical axis, followed by prominent actions such as Done.
- Group items with `ToolbarItemGroup` or `UIBarButtonItemGroup`.
- When space is short, navigation-focused views move toolbar items into the overflow menu, and task-focused views minimize the tab bar.
- Use the system overflow menu.

Relevant APIs: `ToolbarItemVisibilityPriority`, `ToolbarVerticalCompressionBehavior`, and `ToolbarOverflowMenu`.

### F7. System split views are a separate component from ArrangementView

The following belong to `NavigationSplitView` and `UISplitViewController`, **not** to ArrangementView:

- HIG: a split view expands on the inner display and collapses to a single pane on the outer display, the same way it adapts between regular and compact elsewhere. Built from standard components, it adapts its column widths and margins to the Fold automatically (Notes is the example).
- TT-POSE (paraphrased, about 5:12): in a split view such as Reminders, the system keeps both columns visible in an even 50/50 split when folded.

BC presents the 50/50 sizing as ArrangementView behavior. The primary sources do not support that.

## Inference (not stated by Apple)

- **I1.** Split vs Overlay is a property the author declares, not something derived from state. A faithful `Arrangement` primitive takes `style: 'split' | 'overlay'`, defaulting to `'split'`, and adapts *within* that style.
- **I2.** Split's axis choice is roughly `axis = width > height ? horizontal : vertical`. If `axis` is not allowed by `axes`, show only one view (the primary one, going by the single example). Size Class is listed as an input, but no source says how it changes the result.
- **I3.** Overlay: when a division region is active, lay the views out side by side, one per Region, with `overlayArrangementEdge` choosing the primary's side. Otherwise use the layered layout, with the primary view on top and aligned to the bottom (HIG diagram).
- **I4.** For the Bridge Contract: the web layer needs the arrangement's bounds (for aspect ratio) and the Fold's `isActive` and `frame`, not only Size Class. This matches the existing standing decision that the Fold has zero width when flat.
- **I5.** "Displace" as a primitive covers small, local frame changes for non-scrolling interactive elements. The direction depends on the Posture (trailing in book, bottom for controls in tabletop). Scrolling content is never displaced.

## Open unknowns

1. **Fold vs aspect ratio in Split.** When the inner display is taller than wide but has a vertical Fold (book), does an active division region force a horizontal Split? The HIG's aspect-ratio rule says vertical. Splitting across the Fold would be the obvious behavior. No source covers this case. **The primitive has to decide this.**
2. **Overlay side assignment.** `overlayArrangementEdge` has no documented default, and the meaning of `nil` is not documented. Which view takes which Region is unknown.
3. **What "stacked" means for Overlay.** The HIG describes a z-order layer with the primary aligned to the bottom. TT-POSE says "above or below". These may describe the same layout, or the talk may mean vertical stacking.
4. **Which view is kept when Split can't split.** The only example kept the primary. It is not stated whether this is always the case.
5. **How Size Class affects the result.** Size Class is listed as an input, but no rule shows how compact vs regular changes the result, for example whether compact forces a single view.
6. **Default split ratio** for ArrangementView, and how `splitArrangementLayoutRatio` interacts with the Fold (does it snap to 50/50?).
7. The OVS, SVS, and `axes(_:)` pages have abstracts only. The default `axes` value is undocumented, though it is probably both axes.
8. TT-DESIGN (paraphrased) says the tab bar "stays bottom-aligned" on the outer display. This is unreconciled with the HIG's "move to the side". It may mean the bottom of the side column. Unverified.

## Glossary impact

Recommended change. Not made here; the driving session owns `GLOSSARY.md`.

- **Arrangement**: the shape (Split or Overlay) is *declared*, defaulting to Split. Only the layout *within* the shape adapts to Size Class, aspect ratio, and the active Regions.
- **Displacement** and **Span** match Apple's usage (TT-POSE).
- "Side bar on the outer display" in #4 should read "side column for bars on the outer display". A sidebar is an inner-display option.
