import { execFileSync } from 'node:child_process';

// The 'use client' test reads this package's build output, so build it from the current source first.
export default function setup(): void {
  execFileSync('pnpm', ['exec', 'tsdown', '--log-level', 'warn'], { stdio: 'inherit' });
}
