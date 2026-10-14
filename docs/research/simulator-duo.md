# How the Xcode 27.1 Simulator emulates iPhone Duo Postures and the Fold

Research for [#5](https://github.com/Apaonum/foldable/issues/5), part of map [#1](https://github.com/Apaonum/foldable/issues/1). Researched 2026-10-10.

Terms follow [`GLOSSARY.md`](../../GLOSSARY.md). Apple uses different words for some of them:

- Apple's "pose" is our **Posture**.
- Apple's fold "division reserved region" is our **Fold**. It is not one of our **Regions**. Regions are the areas on either side of it.
- "Hinge" appears only in Apple API names such as `UIHingeInteraction`.

## TL;DR

- **Device types:** Xcode 27.1 ships one iPhone Duo device type, `com.apple.CoreSimulator.SimDeviceType.iPhone-Duo` (model `iPhone19,4`), which needs the iOS 27.1 runtime. It is modelled as **two separate integrated displays**: an outer one (466×678 pt) and an inner one (669×951 pt). The device profile contains no Fold geometry. The runtime supplies the Fold.
- **Switching Posture is manual only.** You use the control buttons in **Device Hub**, which replaces Simulator.app in Xcode 27. Apple documents no `simctl` command, `XCUIDevice` API or `devicectl` command that sets Posture or hinge angle.
- **Automated tests:** Posture changes cannot be scripted through any supported interface. The only reported automation drives the Device Hub buttons through the macOS Accessibility API, which is unofficial and secondary-sourced. `simctl io` can screenshot each display separately and power a display on or off.
- **Web APIs:** The iOS 27.1 simulator runtime's WebKit already contains **both** a Device Posture API flag and a Viewport Segments API flag (`viewport-segment-*` env variables, `horizontal-/vertical-viewport-segments` media features). Both are off by default. We have not verified whether Simulator Safari honors them once enabled.
- **Native signal:** Upstream WebKit derives `device-posture` from UIKit's public `UIHingeInteraction`. Only `partiallyOpen` maps to `folded`; every other status maps to `continuous`. That public API is what a **Bridge** would use too.

## 1. Device types

### Verified

- **Local `simctl list devicetypes`** (Xcode 27.0, build 27A266a, with the iOS 27.1 runtime installed) lists exactly one Duo type:

  ```
  iPhone Duo (com.apple.CoreSimulator.SimDeviceType.iPhone-Duo)
  modelIdentifier: iPhone19,4   minRuntimeVersionString: 27.1.0
  ```

  The profile lives at `/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone Duo.simdevicetype` (CoreSimulatorProfiles 404). Its `profile.plist` sets `minRuntimeVersion = 27.1` and `createByDefaultForRuntimeVersions` from 27.1.

- **`capabilities.plist` declares two integrated, touch-enabled displays at @3x, 460 ppi:**

  | `deviceName` | Pixels | Points | Native orientation | Chrome |
  |---|---|---|---|---|
  | `primary` (outer) | 1398×2034 | 466×678 | 0 | `phone15` |
  | `primary-1` (inner) | 2007×2853 | 669×951 | 270 | `phone14` |

  Neither file has a key for the Fold, a hinge, or Posture. The profile does list the feature `com.apple.CoreSimulator.display.resizableScene`.

- **Runtime:** iOS 27.1 runtime build `24A94232`, with WebCore 8625.1.29.10.29. The runtime files are dated 2026-09-24. This is the runtime installed locally, and nothing here shows that it is the RC runtime.

- **Apple's position:** Xcode 27.1 "adds development support for iPhone Duo. Use Device Hub to visualize how your apps behave on iPhone Duo across all poses and orientations." Source: [Apple Developer News, 2026-10-05](https://developer.apple.com/news/?id=kkphp5qo).

- **Simulator known issues** listed in [Xcode 27.1 RC Release Notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27_1-release-notes):
  - "Initial Simulator launch can take several minutes." (187708500)
  - "StandBy is unavailable in the iPhone Duo Simulator runtime." (187708663)
  - "Running and debugging most app extensions is unavailable in the iPhone Duo Simulator runtime." (187708767)

  Those notes say nothing about Posture control or `simctl`.

- **Previews (Xcode 27.1 RC):** "The canvas overrides picker now includes a Display group for previewing content on a device's alternative display." (182598534) This selects a display, not a Posture.

### Secondary, consistent with the above

- [blakecrosley.com](https://blakecrosley.com/blog/xcode-27-1-beta-iphone-duo-simulator) reports the same two display sizes from `simctl io <udid> enumerate`, and creates the device with:

  ```
  xcrun simctl create "Duo-27.1" com.apple.CoreSimulator.SimDeviceType.iPhone-Duo com.apple.CoreSimulator.SimRuntime.iOS-27-1
  ```

- **If the Duo is missing from the device list.** Two fixes appear in Apple Developer Forums [thread 847137](https://developer.apple.com/forums/thread/847137). Both are community answers, not from Apple staff.
  - The accepted answer: update the iOS 27.1 runtime under Xcode Settings → Components.
  - Another reply: add it via Device Hub → "+" → iPhone Duo.

## 2. Switching Posture and the Fold

### Verified (Apple, primary)

- **Device Hub controls.** "Choose the iPhone Duo simulator to run your app in Device Hub. Use the control buttons at the bottom of the screen to open, close, rotate, or fold iPhone Duo." Source: [Prepare your app for iPhone Duo, Tech Talk 111461, 1:17](https://developer.apple.com/videos/play/tech-talks/111461/).
- **The Fold has zero width when flat.** The Fold is "backed by a division reserved region". The talk also says "On iPhone Duo, the fold's division region is only active when someone has folded the device. When flat, it's inactive and has a width of zero." Source: [Strike a pose with adaptive layouts on iPhone Duo, Tech Talk 111463, 6:39 and 7:50](https://developer.apple.com/videos/play/tech-talks/111463/). This matches the GLOSSARY definition of **Fold**.
  - In the Simulator, the Fold therefore only appears in a partially folded (book) Posture.
  - It is queryable with `reservedRegions(kind: .division)` in SwiftUI and UIKit, with `options: .includeInactive` for the zero-width state.
- **Hinge API.** [`UIHingeInteraction`](https://developer.apple.com/documentation/uikit/uihingeinteraction) (iOS 27.1+) delivers updates whose `hinge` exposes an `angle` and a [`UIHinge.Status`](https://developer.apple.com/documentation/uikit/uihinge/status-swift.enum). The status values are `closed`, `partiallyOpen`, `fullyOpen` and `unknown`. Apple does not document a single "Posture" value. Book, flat and tent must be inferred from hinge status and angle plus orientation.
- **Device Hub itself** (Xcode 27's replacement for Simulator.app) is covered in [Get the most out of Device Hub, WWDC26 session 260](https://developer.apple.com/videos/play/wwdc2026/260/). The session does not mention foldable or hinge controls. For scripting it points to `devicectl`, not `simctl`.

### Verified locally (Xcode 27.0 tools only, not 27.1)

- `xcrun simctl help`, `simctl help ui` and `simctl help io` (Xcode 27.0) have no posture, fold or hinge option.
  - `simctl ui` supports only `appearance`, `increase_contrast` and `content_size`.
  - `simctl io` does have display-aware operations:
    - `enumerate`
    - `screenshot --display=<primary|primary-1>`
    - `recordVideo --display=…`
    - `screenConfig [--display=…] power <on|off>`
    - `screenConfig … geometry <w>x<h>[@scale]`
- **DeviceHub.app 27.0** (`com.apple.dt.Devices`, 255.2.6.6), **CoreSimulator.framework** and **devicectl 651.13.5** contain no `posture`, `hinge` or `fold` strings. Local Xcode is 27.0, so this does not rule out new Posture plumbing in the 27.1 versions of these tools.

### Secondary or unverified

- The Device Hub buttons are reportedly named **Rotate Right, Closed, Book, Open**. Open is reported as `fullyOpen` at 180° and Book as `partiallyOpen` at 127°. Source: [blakecrosley.com](https://blakecrosley.com/blog/xcode-27-1-beta-iphone-duo-simulator), measured with a probe app.
- Holding **Option** reportedly reveals a hinge-angle slider. This comes from SwiftLee, quoted by the same blog. That author had not tried it, and we have not verified it.
- **Missing posture widget.** If the widget does not appear, you may have launched the Xcode 27.0 Device Hub, which "lacks the posture control assets". The fix is to open Device Hub via Xcode 27.1 → Open Developer Tool. This is a community reply, not Apple staff: [forum thread 847556](https://developer.apple.com/forums/thread/847556).
- **Screen capture.** A search snippet mentioned a Feedback report saying screen capture only works when the device is fully closed and other hinge positions give a blank image. We could not find it in a primary source, so treat it as **unverified**.
- **Posture change failure.** `simctl io … screenConfig --display=primary power off` reportedly crashed the system shell and required a reboot (blakecrosley).
- `UIScreen.main.bounds` reportedly reports the outer display even when the app runs on the inner one. Apple's own guidance agrees: avoid the main screen and use `window?.windowScene?.screen` (Tech Talk 111461, 4:16).

## 3. Scripting Posture for automated tests

### Verified

- **XCUIDevice** offers buttons, orientation, location, appearance, Siri, VoiceOver and the Digital Crown. It has **no** hinge, Posture or display-selection member. Source: [XCUIDevice](https://developer.apple.com/documentation/xcuiautomation/xcuidevice).
- **simctl** (27.0 help) has no Posture command. See section 2.
- **devicectl** is the CLI that WWDC26 session 260 recommends for Device Hub automation. It lists devices, installs apps, sets appearance and reports info, with no Posture control.

### Secondary

- One author scripted Posture changes by sending `AXPress` to the Device Hub buttons through the macOS Accessibility API. This used the 27.2-beta `simctl` with `DEVELOPER_DIR` pointing at 27.1 (blakecrosley). It is unofficial, depends on the UI, and needs Accessibility permission for the test runner.

### Inference for the test approach (map #1, "Not yet specified: Test approach")

- **Automated tests:**
  - Unit and integration tests should use a **fake Bridge** that emits Posture, Fold, Region and Size Class values.
  - The Simulator cannot be driven into a Posture through any supported API.
- **Simulator checks:**
  - Use the Simulator for manual or semi-automated visual checks.
  - Set the Posture by hand in Device Hub, or with an optional AX-scripting helper marked unsupported.
  - Capture each display with `simctl io booted screenshot --display=primary-1`.
- **Outer vs inner display:** Use `simctl io … screenConfig` and display enumeration to target each display. Note the reported crash when powering off `primary`.

## 4. Do `viewport-segments` / `device-posture` work in Simulator Safari?

The evidence comes in three tiers, from strongest to weakest.

### Tier 1: upstream source (verified semantics)

WebKit commit [`bb06bdc992` "Implement the Device Posture API"](https://github.com/WebKit/WebKit/commit/bb06bdc992), dated 2026-10-01 ([bug 325585](https://bugs.webkit.org/show_bug.cgi?id=325585)):

- The commit adds `navigator.devicePosture` and the `device-posture` media query "behind an off-by-default feature flag". In [`UnifiedWebPreferences.yaml`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml), `DevicePostureAPIEnabled` has `status: testable` and `defaultValue: false`.
- On iOS, `WKContentView` installs a `UIHingeInteraction`. The mapping is:

  ```objc
  bool isFolded = update.hinge.status == UIHingeStatusPartiallyOpen;
  page->setDevicePostureType(isFolded ? DevicePostureType::Folded : DevicePostureType::Continuous);
  ```

  So `closed`, `fullyOpen` and `unknown` all map to `continuous`. Tent and book are not distinguished. Only "partially open" counts as folded.
- We found no Viewport Segments implementation in public WebKit `main` via GitHub code search. Code search coverage is incomplete, so this is weak evidence of absence.

### Tier 2: shipped iOS 27.1 simulator runtime (presence only, verified locally)

A string scan of the runtime `24A94232` `dyld_sim_shared_cache_arm64*` found the following.

**Device Posture:**
- `DevicePostureAPIEnabled`, "Device Posture API", "Enable the Device Posture API"
- `device-posture`
- `setUpHingeInteraction`, `setDevicePostureType`, `_hingeInteraction`

**Viewport Segments:**
- `ViewportSegmentsAPIEnabled`, "Viewport Segments API", "Enable the Viewport Segments API"
- `viewport-segments`
- `viewport-segment-width/height/top/bottom/left/right`
- `horizontal-viewport-segments`, `vertical-viewport-segments`
- `setViewportSegments…`

So the shipped 27.1 WebKit is ahead of public `main` on Viewport Segments. Neither tier tells us how segments are computed. For example, we don't know whether one segment per Region is derived from the Fold's division region.

### Tier 3: is it honored at runtime? **Unknown**

String presence does not show that the feature works. To verify, use the Xcode 27.1 Device Hub:

1. In the iPhone Duo Simulator, open Settings → Apps → Safari → Advanced → Feature Flags. Check whether "Device Posture API" and "Viewport Segments API" are listed. It is unclear whether `testable`-status flags appear in that UI on release builds.
2. If they are listed, enable them and load a test page that logs:
   - `navigator.devicePosture?.type`
   - `matchMedia('(device-posture: folded)').matches`
   - `matchMedia('(horizontal-viewport-segments: 2)').matches`
   - `getComputedStyle` of an element using `env(viewport-segment-width 0 0)` and `env(viewport-segment-left 1 0)`
3. Toggle Book ↔ Open ↔ Closed and record the values.
4. Repeat inside a minimal WKWebView Host. Web Inspector's `Inspectable` settings may help.

### Inference for map #1

- Both flags are **off by default** in iOS 27.1.
- A custom WKWebView **Host** has no public API to enable an off-by-default WebKit feature flag. That would need private SPI, which we assume and have not verified.
- So the standing fallback ("`viewport-segments` / `device-posture` when present") will give **no Fold data** in production Safari or WKWebView on iOS 27.1. Feature-detect it, but expect the **Bridge** to carry the load.
- The Bridge can use the same public signals WebKit uses:
  - `UIHingeInteraction` for status and angle
  - `reservedRegions(kind: .division)` for the Fold rect
  - size classes for Size Class
- WebKit's mapping (only `partiallyOpen` → folded) is a reasonable default for the Bridge's Posture field.

## Open unknowns

1. Whether Xcode 27.1's `simctl`, `devicectl` or `XCUIDevice` gained any undocumented Posture or hinge control. Local tools are 27.0. **Check:** `xcrun simctl help` and `strings` on Device Hub 27.1 for `hinge` and `posture`.
2. Whether the Device Posture and Viewport Segments flags are visible and functional in Simulator Safari and WKWebView. See the procedure in section 4.
3. How the shipped Viewport Segments implementation derives segments: from the Fold division region, from each display, or something else.
4. Whether `simctl io screenshot` returns blank images in non-closed Postures on the RC. The claim is unverified.
5. The exact Fold width in the book Posture and the hinge angle range offered by Device Hub. Apple gives no dimensions.
6. Whether the locally installed runtime `24A94232` matches the RC runtime. The blog cites build `24A94401`.

## Sources

**Primary (Apple):**
- [Xcode 27.1 RC Release Notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27_1-release-notes)
- [Prepare your app for iPhone Duo, Tech Talk 111461](https://developer.apple.com/videos/play/tech-talks/111461/)
- [Strike a pose with adaptive layouts on iPhone Duo, Tech Talk 111463](https://developer.apple.com/videos/play/tech-talks/111463/)
- [Get the most out of Device Hub, WWDC26 session 260](https://developer.apple.com/videos/play/wwdc2026/260/)
- [Prepare and submit your apps for iPhone Duo, Apple Developer News](https://developer.apple.com/news/?id=kkphp5qo)
- [`UIHingeInteraction`](https://developer.apple.com/documentation/uikit/uihingeinteraction), [`UIHingeInteraction.Update`](https://developer.apple.com/documentation/uikit/uihingeinteraction/update), [`UIHinge.Status`](https://developer.apple.com/documentation/uikit/uihinge/status-swift.enum)
- [`XCUIDevice`](https://developer.apple.com/documentation/xcuiautomation/xcuidevice)
- [Safari 27.2 Beta Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-27_2-release-notes): no Duo or segment items. The Safari 27.1 notes page returned 404.

**Primary (source and local artifacts):**
- [WebKit commit bb06bdc992](https://github.com/WebKit/WebKit/commit/bb06bdc992) and [`UnifiedWebPreferences.yaml`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml)
- Local: Xcode 27.0 (27A266a) `simctl` and `devicectl` help, the iPhone Duo `.simdevicetype` profile, and the iOS 27.1 (24A94232) runtime dyld cache

**Secondary and community (marked inline):**
- [blakecrosley.com: Xcode 27.1 Beta, Your App in the iPhone Duo Simulator](https://blakecrosley.com/blog/xcode-27-1-beta-iphone-duo-simulator)
- Apple Developer Forums threads [847556](https://developer.apple.com/forums/thread/847556) and [847137](https://developer.apple.com/forums/thread/847137) (no Apple-staff replies)
