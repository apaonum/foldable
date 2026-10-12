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
pnpm build  # packages, then examples/* against them
```

`examples/next` (App Router) uses `@foldablejs/react` and `@foldablejs/core/primitives.css`; run it with `pnpm --filter @foldablejs/example-next dev` after `pnpm build`.

Shared contract fixtures live in `fixtures/` and are read by both JS and Swift tests.
