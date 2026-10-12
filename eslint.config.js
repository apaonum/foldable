import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // examples/* import the built packages, so `next build` / `nuxt build` typecheck them after `pnpm build`.
  {
    ignores: [
      '**/dist',
      '**/dist-iife',
      '**/node_modules',
      '**/.next',
      'examples/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
);
