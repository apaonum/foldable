import { execFileSync } from 'node:child_process';

// The Bridge fake runs core's built bootstrap IIFE, so build it from the current source first.
export default function setup(): void {
  execFileSync('pnpm', ['--filter', '@foldablejs/core', 'exec', 'tsdown', '--log-level', 'warn'], {
    stdio: 'inherit',
  });
}
