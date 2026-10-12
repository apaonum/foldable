# foldable

Fold-aware layout for web content on iPhone Duo, mainly inside a native app's WKWebView. A Swift Bridge reports the Fold, Size Class, safe area, and layout margins to the page. `@foldablejs/core` turns them into CSS custom properties, `data-foldable-*` attributes, and a small state API. `primitives.css` adds pure-CSS Split, Overlay, and Displace layouts that follow Apple's ArrangementView rules. Terms follow [`GLOSSARY.md`](GLOSSARY.md).

<!-- SCREENSHOT #39: examples/next on the inner display, book Posture, Split + Displace (docs/manual-checks/v0.1.0/inner-book-split.png) -->

## Documentation

- [Host integration](docs/host.md): add the Swift package, attach the Bridge, and what the Bridge does on its own.
- [CSS reference](docs/css.md): every `--foldable-*` property and `data-foldable-*` attribute.
- [JS reference](docs/js.md): `getState`, `subscribe`, `SERVER_STATE`, the helpers, and the React and Vue adapters.
- [Primitive guide](docs/primitives.md): Split, Overlay, and Displace, with DOM-order guidance.
- [Recipes](docs/recipes.md): focus restoration, `scroll-padding` for an Overlay, and the software keyboard.
- [Known limits](docs/limits.md): what v0.1 gets wrong or leaves out.

## Development

Development needs Node 24 (`.nvmrc`) and pnpm (the version is pinned in `package.json`). Use 24.11 or later, which tsdown and Vitest need. The Nuxt example declares 24.15 or later. The published packages need only Node 20 or later.

```sh
pnpm install
pnpm --filter @foldablejs/core exec playwright install webkit
pnpm typecheck
pnpm lint
pnpm test   # Node unit + WebKit browser (Vitest)
pnpm build
```

Shared contract fixtures live in `fixtures/` and are read by both JS and Swift tests.

Every `ts` and `tsx` code block in `README.md` and `docs/` must appear verbatim in a file under `docs/samples/`. `pnpm typecheck` compiles those files, and `pnpm test:scripts` fails on a code block that no sample contains.

## Packages and examples

- `packages/core`: `@foldablejs/core` (state, CSS vars, `primitives.css`)
- `packages/react`: `@foldablejs/react` (`useFoldable()` hook, React ≥ 18, `'use client'` entry)
- `packages/vue`: `@foldablejs/vue` (`useFoldable()` composable, Vue ≥ 3.3)
- `examples/nuxt`: Nuxt app using every primitive. `pnpm --filter example-nuxt... build`
- `examples/next`: Next.js App Router app using every primitive. `pnpm --filter example-next... build`

## Swift package

Add `Foldable` with SwiftPM by git URL (iOS 17+), keep the WKWebView edge-to-edge, and attach a Bridge before loading:

```swift
import Foldable

webView.scrollView.contentInsetAdjustmentBehavior = .never
Bridge.attach(to: webView)
```

The Bridge pushes a full snapshot whenever the Fold, Size Class, safe area, or layout margins change. The Host forwards nothing. Don't replace or re-inject the bootstrap yourself. See [Host integration](docs/host.md) for the details, including the `navigationDelegate` proxy. `examples/ios-host` is a minimal Host and holds the app-hosted Simulator tests (see its README).

`Sources/Foldable/Resources/bootstrap.js` is built from `packages/core` and committed (ADR 0001). After changing the core, run `pnpm bootstrap:sync` and commit the result; CI fails on a stale copy.

```sh
swift format lint --strict --recursive Package.swift Sources Tests
swift build && swift test   # macOS: pure snapshot and seed tests
# iOS Simulator (UIKit/WebKit tests); select the iPhone Duo by id, not name:
xcodebuild test -scheme Foldable -destination "platform=iOS Simulator,id=$UDID" -collect-test-diagnostics never
```

What CI covers: the Linux job runs every JS check, including `pnpm test:scripts`. The macOS job runs `swift format lint`, `swift build` and `swift test` (pure contract code only, since macOS has no UIKit), then builds the package for the iOS Simulator with the newest Xcode on the hosted runner. Hosted runners have no Xcode 27.1, so that build compiles out the iOS 27.1 reserved-region read and never checks it. CI runs no Simulator tests. The app-hosted suites in `examples/ios-host` and the iOS 27.1 build run locally before each release.

## Releasing

The Swift package and every npm package (`@foldablejs/core`, `react`, `vue`) ship together from one `vX.Y.Z` tag.

1. `pnpm release:bump X.Y.Z` sets that version on every published package.
2. Run the manual checks on the iPhone Duo Simulator and commit `docs/manual-checks/vX.Y.Z.md` (see [`docs/manual-checks/`](docs/manual-checks/README.md)).
3. `pnpm release:check vX.Y.Z` runs the same gate as the release workflow.
4. Merge, then tag the merged commit `vX.Y.Z` and push the tag.

`.github/workflows/release.yml` runs on the tag. It refuses to publish unless the versions match the tag and the checklist is committed with every item ticked, then publishes the `pnpm pack` tarballs with `npm publish --provenance` through npm trusted publishing (OIDC, no tokens). Run it by hand (`workflow_dispatch`) to rehearse a tag with `npm publish --dry-run`.
