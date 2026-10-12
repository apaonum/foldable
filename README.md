# foldable

Fold-aware layout for web content on iPhone Duo. See `GLOSSARY.md` for vocabulary.

## Development

Requires Node 24 (`.nvmrc`) and pnpm (version pinned in `package.json`).

```sh
pnpm install
pnpm --filter @foldablejs/core exec playwright install webkit
pnpm typecheck
pnpm lint
pnpm test   # Node unit + WebKit browser (Vitest)
pnpm build
```

Shared contract fixtures live in `fixtures/` and are read by both JS and Swift tests.

## Packages and examples

- `packages/core`: `@foldablejs/core` (state, CSS vars, `primitives.css`)
- `packages/vue`: `@foldablejs/vue` (`useFoldable()` composable, Vue ≥ 3.3)
- `examples/nuxt`: Nuxt app using every primitive. `pnpm --filter example-nuxt... build`

## Swift package

Add `Foldable` with SwiftPM by git URL (iOS 17+), then attach a Bridge to your web view before loading:

```swift
import Foldable

webView.scrollView.contentInsetAdjustmentBehavior = .never // keep the web view edge-to-edge
Bridge.attach(to: webView)
```

Don't replace or re-inject the bootstrap yourself; the Bridge owns one document-start seed and keeps your own user scripts in order.

`Sources/Foldable/Resources/bootstrap.js` is built from `packages/core` and committed (ADR 0001). After changing the core, run `pnpm bootstrap:sync` and commit the result; CI fails on a stale copy.

```sh
swift format lint --strict --recursive Package.swift Sources Tests
swift build && swift test   # macOS: pure snapshot and seed tests
# iOS Simulator (UIKit/WebKit tests); select the iPhone Duo by id, not name:
xcodebuild test -scheme Foldable -destination "platform=iOS Simulator,id=$UDID" -collect-test-diagnostics never
```
