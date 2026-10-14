# WebKit fold APIs on iOS 27.1 (Safari and WKWebView)

Research for [#3](https://github.com/Apaonum/foldable/issues/3). Researched 2026-10-10.
Terms follow `GLOSSARY.md`. W3C terms (`viewport-segments`, `device-posture`, hinge) appear only when naming web APIs.

WebKit source links are pinned to `main` at [`9c50e09`](https://github.com/WebKit/WebKit/tree/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b), referred to below as `WK@9c50e09`.

## Answer in brief

| Web API | Spec | Apple says (iOS 27.1) | Public WebKit source (`WK@9c50e09`) | WKWebView Host can enable? |
|---|---|---|---|---|
| `navigator.devicePosture` + `@media (device-posture)` | [W3C Device Posture](https://w3c.github.io/device-posture/) | Opt-in experimental Safari feature flag | Implemented 2026-10-01, flag `DevicePostureAPIEnabled`, status `testable`, default `false` | No public API. SPI and a debug default exist (see below), unverified on a 27.1 device |
| `@media (horizontal-viewport-segments / vertical-viewport-segments)`, `env(viewport-segment-*)`, `window.viewport.segments` | [CSS Viewport L1](https://drafts.csswg.org/css-viewport/#dom-viewport-segments) | Opt-in experimental Safari feature flag | **No code at all** | Unknown: no flag name exists publicly |
| `visualViewport.segments` (older shape) | superseded by `window.viewport.segments` | not mentioned | Absent from `VisualViewport.idl` | No |

Consequence for the spec: a WKWebView Host gets **no** Fold geometry from WebKit by default. The Bridge is the only dependable source of Fold, Regions, and Posture in v0.1. The `device-posture` / `viewport-segments` fallback in the map applies only to Safari users who turn the flags on.

## Verified facts

### F1. Apple: both APIs are opt-in experimental flags in iOS 27.1 Safari
An Apple DTS Engineer, in the iPhone Duo group lab summary, wrote that "there are the Viewport Segments and Device Posture APIs. Both are opt-in experimental features in iOS 27.1, and can be enabled for testing in Settings > Apps > Safari > Advanced > Feature Flags."
Source: [Apple Developer Forums thread 847644](https://developer.apple.com/forums/thread/847644).
The same answer says there will be no way to detect "iPhone Duo" from the web; use responsive design instead.

This confirms the first half of the [plurigent tutorial](https://plurigent.com/tutorials/iphone-duo/webview) claim. That tutorial cites this same forum thread and says it ran no tests.

### F2. Device Posture is in public WebKit, off by default
- Commit [`bb06bdc`](https://github.com/WebKit/WebKit/commit/bb06bdc992326258c402dd4594c2cffd77ca3795) (`322390@main`, 2026-10-01, [bug 325585](https://bugs.webkit.org/show_bug.cgi?id=325585)), "Implement the Device Posture API behind an off-by-default feature flag."
- Flag definition ([UnifiedWebPreferences.yaml L1930-1937](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml#L1930-L1937)): `DevicePostureAPIEnabled`, `status: testable`, `defaultValue: false`, `defaultsOverridable: true`.
- The status legend in the same file ([L31-33](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml#L31-L33)) says `testable` means "OFF by default. Enabled in test infrastructure only." So the flag is off even in Safari Technology Preview, which only turns on `preview` features by default.
- [Safari Technology Preview 254](https://webkit.org/blog/18420/release-notes-for-safari-technology-preview-254/) (2026-10-08) covers `321068@main…322634@main`, so it includes the commit. Its release notes do not mention it.
- The JS surface is gated by `EnabledBySetting=DevicePostureAPIEnabled` and `SecureContext` ([DevicePosture.idl](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebCore/Modules/device-posture/DevicePosture.idl), [Navigator+DevicePosture.idl](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebCore/Modules/device-posture/Navigator+DevicePosture.idl)). When the flag is off, `'devicePosture' in navigator` is `false`.
- The `device-posture` media feature is always registered, but it matches no value when the flag is off ([MediaQueryFeatures.cpp L367-383](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebCore/css/query/MediaQueryFeatures.cpp#L367-L383)). CSS alone therefore cannot tell "unsupported" from "disabled". Feature-detect in JS.

### F3. How WebKit maps hardware to Posture
- From the commit message and [`WKContentViewInteraction.mm`](https://github.com/WebKit/WebKit/commit/bb06bdc992326258c402dd4594c2cffd77ca3795): `WKContentView` always installs a `UIHingeInteraction`. Hinge status `UIHingeStatusPartiallyOpen` maps to `folded`. Fully open or fully closed maps to `continuous`.
- The interaction is installed whether or not the flag is on, so the preference is the only gate. This is guarded by `HAVE(UI_HINGE_INTERACTION)` ([PlatformHave.h L1887-1889](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WTF/wtf/PlatformHave.h#L1887-L1889)).
- `UIHinge` / `UIHingeInteraction` are public UIKit API, available from iOS 27.1 ([UIHinge docs](https://developer.apple.com/documentation/uikit/uihinge)). They report `angle` (radians) and `status`.
- How this maps to the Glossary: book Posture → `folded`; flat → `continuous`; closed (outer display) → `continuous`. Tent is presumably "partially open" and so `folded`, but this is not confirmed.
- The W3C spec defines `continuous` as flat or non-folding and `folded` as physically folded at an angle no greater than flat ([Device Posture spec](https://w3c.github.io/device-posture/)). WebKit only reports the type. It does **not** expose the angle to the web.

### F4. Viewport Segments: no public WebKit code
- GitHub code search of `WebKit/WebKit` (default branch) finds 0 hits for `viewport-segment`, `horizontal-viewport-segments`, or `ViewportSegment`. There is no preference with "segment" in its name in `UnifiedWebPreferences.yaml`.
- [`VisualViewport.idl`](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebCore/page/VisualViewport.idl) has no `segments` attribute.
- WebKit standards positions for both APIs are still open with no position: [#327 Viewport Segments](https://github.com/WebKit/standards-positions/issues/327), [#328 Device Posture](https://github.com/WebKit/standards-positions/issues/328). On both, a Chrome DevRel commenter wrote (2026-09-20) that the feature is "available behind a flag in the 27.1 Simulator".

### F5. Public Safari release branches do not contain either API
- `safari-7625-branch` (last commit 2026-07-28) and the newest point branch `safari-7625.1.29.18-branch` (last commit 2026-09-04) have no `Modules/device-posture` directory. Their `UnifiedWebPreferences.yaml` has no posture or segment flag.
- The WebKit blog has no "Safari 27.1" features post yet ([blog index](https://webkit.org/blog/)). The latest is [Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/).

### F6. WKWebView: no public switch; SPI and debug-default paths exist in source
- **Public `WKPreferences` / `WKWebpagePreferences`:** there is no per-feature toggle and no fold-related property.
- **SPI** ([WKPreferencesPrivate.h L149-151](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/Cocoa/WKPreferencesPrivate.h#L149-L151)): `+[WKPreferences _features]` (iOS 16.4+) and `-[WKPreferences _setEnabled:forFeature:]` can switch any listed feature. This is private API, which risks App Store rejection. It is acceptable for debug or test builds only.
- **Debug default:** `defaultsOverridable: true` means `WebPreferences::platformInitializeStore` reads an override from the app's `NSUserDefaults` once, when the store is initialised ([WebPreferencesCocoa.mm](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/Cocoa/WebPreferencesCocoa.mm)). The exact key prefix is unclear. The YAML comment says `WebKitDebug`, while `WebPageGroup` passes `"WebKit2."` as `globalDebugKeyPrefix` ([WebPageGroup.cpp](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/WebPageGroup.cpp)). It is unverified which prefix applies to a `WKWebViewConfiguration`.
- **WKWebView already reads the Fold, but only for PDFs.** In [`WKWebViewIOS.mm` L894-937](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm#L894-L937), `_updatePDFDisplayModeIfNeeded` calls `reservedRegionsOfKind:divisionRegionKind`. When exactly one centred division region exists, it switches PDFs to two-up. That flag (`TwoUpPDFDisplayModeSupportEnabled`) is `internal`, default on. Nothing from the division region reaches web content (no CSS, no JS).

### F7. Safe area, Fold, and `dvh` in an edge-to-edge WKWebView
- **The Fold is not part of `safeAreaInsets`.** Apple DTS ([thread 847644](https://developer.apple.com/forums/thread/847644)) says that in a partially folded Posture the fold "acts as a reserved region (specifically a division region)". It also says relying only on `safeAreaInsets` "is insufficient" for fold avoidance. The native API is `UIView.reservedRegions(kind: .division)`, which has zero width when flat ([Tech Talk 111463](https://developer.apple.com/videos/play/tech-talks/111463/)).
- **Safe areas are asymmetric on iPhone Duo** (DTS, same thread). On the outer display, bars move to the trailing edge (`verticalBarEdge`), so you get a large inset on one side only. In open landscape or Split View, leading and trailing insets differ. Web CSS must treat each `env(safe-area-inset-*)` side independently.
- **Where `env(safe-area-inset-*)` comes from in WKWebView:** `-_computedUnobscuredSafeAreaInset` in [`WKWebViewIOS.mm` ~L870-892](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm#L870-L892). It uses the web view's own `safeAreaInsets`, minus any obscured insets the Host set. A Host can override it with SPI (`_haveSetUnobscuredSafeAreaInsets`). For the page to receive non-zero values and draw edge-to-edge, it needs `<meta name="viewport" content="viewport-fit=cover">` ([WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)). Otherwise the scroll view's inset adjustment pads the content natively and the page sees 0. If the page and the Host both pad, the padding is doubled.
- **`dvh` / `svh` / `lvh`:** in a WKWebView these come from the Host. `-[WKWebView setMinimumViewportInset:maximumViewportInset:]` (public, iOS 15.5+, [WKWebView.h](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/Cocoa/WKWebView.h)) sets the `lv*`/`sv*` extremes for a Host with collapsing chrome. With fixed chrome, all three units equal the web view's height. None of these units knows about the Fold.
- How the software keyboard interacts with `dvh` and Regions is a separate map item ("Software keyboard and the Fold"). It is not covered here.

## Inference (not verified)

- **I1. Apple's shipping iOS 27.1 WebKit probably contains code not yet in public WebKit.** Evidence: DTS says Viewport Segments exists as a flag in 27.1, but no public branch has any Viewport Segments code. Device Posture landed on `main` only on 2026-10-01, after the newest public Safari branch. The `webkit-*-embargoed` branch pattern shows Apple develops hardware-tied features privately. The likely explanation is that both were developed privately for the iPhone Duo and that upstreaming has started with Device Posture.
- **I2.** If the shipped 27.1 build matches `main`, Device Posture in an app's WKWebView is **off by default**. This is consistent with the plurigent claim that the APIs "are not automatically available in app WKWebViews". Safari's Feature Flags toggle changes Safari's settings, not the Host app's, so it does not affect the Host's WKWebView.
- **I3.** Even with flags on, Device Posture only gives `folded`/`continuous`. It gives no Fold geometry and no angle. Viewport Segments (if shipped) would give Region rects, but behind a flag users must turn on. Neither is something v0.1 can rely on. The Bridge Contract must carry Fold rect, Regions, Posture, and Size Class itself, sourced from `reservedRegions(kind: .division)`, `UIHingeInteraction`, and trait collections.
- **I4.** The web fallback should feature-detect `'devicePosture' in navigator` and `window.viewport?.segments` (or `matchMedia('(horizontal-viewport-segments: 2)')`). Do not use `@media (device-posture)` as a detection signal, because of F2.

## Open unknowns

1. **Which WebKit revision ships in iOS 27.1?** Apple has not published iOS 27.1 WebKit sources. Settling this needs either Apple's open-source drop or a device/Simulator check.
2. **What is the Viewport Segments flag called, and what does it implement?** Media features, `env()` variables, `window.viewport.segments` vs `visualViewport.segments`? Check in the Xcode 27.1 Simulator: Safari > Settings > Advanced > Feature Flags, then test each surface.
3. **Do the SPI paths work on a 27.1 build?** Does `_features` list a `testable` feature on a release build? Which `NSUserDefaults` key prefix applies to a `WKWebViewConfiguration`? Needs a Simulator test.
4. **Does the Simulator drive `UIHingeInteraction`?** That is, does changing Posture in Device Hub fire `navigator.devicePosture` `change` events? This feeds the map's "Test approach" item.
5. **`SecureContext` for Hosts.** `navigator.devicePosture` needs a secure context. Behaviour under `file://` or a custom `WKURLSchemeHandler` scheme is unverified.
6. **Tent Posture → `folded`?** This depends on the `UIHinge.Status` value UIKit reports for tent. The `Status` enum cases are not documented on the fetched page.
7. **Is there an official WKWebView guidance thread?** A forum question titled "Adapting WKWebView content to reserved regions on iPhone Duo" exists in search results, but it could not be retrieved and no answer was seen.

## Sources

Primary:
- WebKit source, `main` @ `9c50e09`: [UnifiedWebPreferences.yaml](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml), [device-posture module](https://github.com/WebKit/WebKit/tree/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebCore/Modules/device-posture), [MediaQueryFeatures.cpp](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebCore/css/query/MediaQueryFeatures.cpp), [WKWebViewIOS.mm](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm), [WKPreferencesPrivate.h](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/Cocoa/WKPreferencesPrivate.h), [WKWebView.h](https://github.com/WebKit/WebKit/blob/9c50e091cb1b47fddb7afa7ffec7f9f22c0ee38b/Source/WebKit/UIProcess/API/Cocoa/WKWebView.h)
- WebKit commit [bb06bdc](https://github.com/WebKit/WebKit/commit/bb06bdc992326258c402dd4594c2cffd77ca3795) / [bug 325585](https://bugs.webkit.org/show_bug.cgi?id=325585)
- WebKit standards positions [#327](https://github.com/WebKit/standards-positions/issues/327), [#328](https://github.com/WebKit/standards-positions/issues/328)
- WebKit blog: [STP 254](https://webkit.org/blog/18420/release-notes-for-safari-technology-preview-254/), [Safari 27.0 features](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/), [Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- Apple: [UIHinge](https://developer.apple.com/documentation/uikit/uihinge), [Tech Talk 111463 "Strike a pose with adaptive layouts on iPhone Duo"](https://developer.apple.com/videos/play/tech-talks/111463/), [Forums thread 847644 (DTS, iPhone Duo group lab summary)](https://developer.apple.com/forums/thread/847644)
- W3C: [Device Posture API](https://w3c.github.io/device-posture/), [CSS Viewport L1 segments](https://drafts.csswg.org/css-viewport/#dom-viewport-segments); MDN [Viewport Segments API](https://developer.mozilla.org/en-US/docs/Web/API/Viewport_Segments_API)

Secondary (checked against the primary sources above): [plurigent iPhone Duo WebView tutorial](https://plurigent.com/tutorials/iphone-duo/webview)
