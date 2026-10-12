import { execFileSync } from 'node:child_process';

// Browser tests run the real bootstrap IIFE, so build it from the current source first.
export default function setup(): void {
  execFileSync('pnpm', ['exec', 'tsdown', '--log-level', 'warn'], { stdio: 'inherit' });
}
