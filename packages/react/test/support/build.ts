import { execFileSync } from 'node:child_process';

// Tests import @foldablejs/core through its package exports (dist) and check this
// package's own build output, so both must be built from the current source first.
export default function setup(): void {
  execFileSync('pnpm', ['--filter', '@foldablejs/core', '--filter', '@foldablejs/react', 'build'], {
    stdio: 'inherit',
  });
}
