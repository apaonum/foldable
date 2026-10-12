# examples/ios-host

A plain `UIViewController` with one edge-to-edge WKWebView (`contentInsetAdjustmentBehavior = .never`) and `Bridge.attach(to:)`. The bundled `App/index.html` shows the Posture, Size Class, `seq` and full state, and draws the Fold. It also hosts the app-hosted Simulator tests in `HostTests/`.

The project uses the repo-root package as a local Swift package, so it always builds the working copy.

## Requirements

- Xcode 27.1 (27A9275). Earlier SDKs have no fold APIs. A community report says the Xcode 27.2 beta 2 Simulator crashes, so don't use it. If `xcode-select -p` points elsewhere, prefix commands with `DEVELOPER_DIR=<Xcode 27.1>/Contents/Developer`.
- An iPhone Duo Simulator on the iOS 27.1 runtime. Select it by id: when two devices share the name, a `name=` destination fails.

```sh
UDID=$(xcrun simctl list devices -j | python3 -c "import json,sys;print(next(d['udid'] for r,ds in json.load(sys.stdin)['devices'].items() if 'iOS-27-1' in r for d in ds if d['name']=='iPhone Duo'))")
# none yet? xcrun simctl create "Duo-27.1" com.apple.CoreSimulator.SimDeviceType.iPhone-Duo com.apple.CoreSimulator.SimRuntime.iOS-27-1
```

## Simulator tests (run locally before each release)

```sh
cd examples/ios-host
xcodebuild test -project FoldableHost.xcodeproj -scheme FoldableHost \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath /tmp/foldable-host-dd -collect-test-diagnostics never
```

- Always pass `-collect-test-diagnostics never`. Without it, a failing run hangs for 600 s collecting diagnostics.
- A run takes about 1–2 minutes end to end. The tests themselves take about 8 s.
- Every run logs `invalidDigitCount(94232)` and `IDERunDestination` lines. They're harmless.
- `NavigationTests` cover reloads, a state change while a navigation is in flight, the re-push after `didCommit`, the Host's own `navigationDelegate` (set after `attach`, then replaced) and Host script order across many seed replacements.
- The tests drive the Bridge's internal input closure, so they need no Posture setup and pass on either display. Each change signal is real: a layout pass, `safeAreaInsetsDidChange`, or a `horizontalSizeClass` trait override.

## Example Host by hand

```sh
cd examples/ios-host
xcodebuild build -project FoldableHost.xcodeproj -scheme FoldableHost \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath /tmp/foldable-host-dd
xcrun simctl install "$UDID" /tmp/foldable-host-dd/Build/Products/Debug-iphonesimulator/FoldableHost.app
xcrun simctl launch "$UDID" dev.foldable.host
xcrun simctl io "$UDID" screenshot --display=primary-1 inner.png   # primary = outer display
```

You can't script Posture. Set it in Device Hub (Xcode 27.1 → Open Developer Tool) with Rotate / Closed / Book / Open. In each Posture, check:

- **Book**: heading `book`, a vertical striped Fold at x 455.5 (40 wide), Size Class `regular`, and `seq` higher than 1.
- **Tabletop**: heading `tabletop`, with a horizontal Fold at y 455.5.
- **Flat**: heading `none`, no Fold drawn, and `fold: null`.

The Size Class can flip 2–4 s after the Fold, so a short `book` + `compact` moment is expected. Safari Web Inspector can attach to the page (`isInspectable`).
