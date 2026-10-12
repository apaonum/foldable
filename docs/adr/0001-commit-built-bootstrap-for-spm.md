# Commit the built bootstrap into the Swift package

The Bridge's document-start bootstrap is built from `packages/core` (it reuses the core's state → CSS function), but SwiftPM resolves packages from git tags and cannot run an npm build. So the built IIFE is committed at `Sources/Foldable/Resources/bootstrap.js`, and CI rebuilds it and fails on `git diff --exit-code`, keeping `toCSS` in core the single source of truth while making a stale artifact a CI failure instead of silent Bridge ↔ core skew. Don't delete it as "generated code in git" or hand-edit it; rebuild it.

## Considered Options

- Hand-write the bootstrap in plain JS inside the Swift resources: duplicates the state → CSS mapping across two languages' release paths.
- Build and commit it only on a release branch before tagging: `main` would carry a stale or missing resource, breaking `swift build` and the Simulator tests between releases.

See [What repo layout, tooling, and distribution does foldable v0.1 use?](https://github.com/Apaonum/foldable/issues/18).
