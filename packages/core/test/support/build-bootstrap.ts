import { execFileSync } from 'node:child_process';

// Browser tests run the real bootstrap IIFE, so build it from the current source first.
// The root `pnpm test` builds once and sets FOLDABLE_CORE_BUILT: rebuilding here would wipe
// dist-iife/ while the adapters' parallel runs read it.
export default function setup(): void {
  if (process.env.FOLDABLE_CORE_BUILT === '1') return;
  execFileSync('pnpm', ['exec', 'tsdown', '--log-level', 'warn'], { stdio: 'inherit' });
}
