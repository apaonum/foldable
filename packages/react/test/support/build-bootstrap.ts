import { execFileSync } from 'node:child_process';

// The Bridge fake runs core's built bootstrap IIFE, so build it from the current source first.
// The root `pnpm test` builds core once and sets FOLDABLE_CORE_BUILT, so parallel package
// runs don't rebuild (and wipe) dist-iife/ while another reads it.
export default function setup(): void {
  if (process.env.FOLDABLE_CORE_BUILT === '1') return;
  execFileSync('pnpm', ['--filter', '@foldablejs/core', 'exec', 'tsdown', '--log-level', 'warn'], {
    stdio: 'inherit',
  });
}
