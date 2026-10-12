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
- `packages/react`: `@foldablejs/react` (`useFoldable()` hook, React ≥ 18, `'use client'` entry)
- `packages/vue`: `@foldablejs/vue` (`useFoldable()` composable, Vue ≥ 3.3)
- `examples/nuxt`: Nuxt app using every primitive. `pnpm --filter example-nuxt... build`
- `examples/next`: Next.js App Router app using every primitive. `pnpm --filter example-next... build`
