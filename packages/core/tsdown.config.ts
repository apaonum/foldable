import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { index: 'src/index.ts', bootstrap: 'src/bootstrap.ts' },
    format: 'esm',
    dts: true,
    copy: 'src/primitives.css',
  },
  {
    entry: { bootstrap: 'src/bootstrap-iife.ts' },
    format: 'iife',
    dts: false,
    minify: true,
    outDir: 'dist-iife',
  },
]);
