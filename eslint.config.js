import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/dist-iife',
      '**/node_modules',
      'Sources/Foldable/Resources',
      '.build',
      '**/.nuxt',
      '**/.output',
      '.claude',
      '**/.next',
      // Typechecked by `next build` against the built packages instead.
      'examples/next/**',
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
  {
    // Doc signatures are ambient declarations compared by type against the real exports.
    files: ['docs/samples/*-signature.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    // node:test's test() returns a promise the runner already tracks.
    files: ['scripts/**/*.test.ts'],
    rules: { '@typescript-eslint/no-floating-promises': 'off' },
  },
);
