import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codeBlocks, docSampleProblems, unsampledBlocks } from './doc-samples.ts';

test('codeBlocks returns only ts and tsx fences, with their line', () => {
  const md = [
    '# Title',
    '',
    '```ts',
    'const a = 1;',
    '```',
    '',
    '```css',
    'a {}',
    '```',
    '',
    '```tsx',
    'export const B = () => <b />;',
    '```',
  ].join('\n');
  assert.deepEqual(codeBlocks(md), [
    { line: 3, code: 'const a = 1;' },
    { line: 11, code: 'export const B = () => <b />;' },
  ]);
});

test('a block is sampled when a sample file contains it verbatim', () => {
  const sources = ["import { getState } from '@foldablejs/core';\n\nconst s = getState();\n"];
  assert.deepEqual(unsampledBlocks([{ line: 1, code: 'const s = getState();' }], sources), []);
});

test('a sample may prefix a doc signature with declare', () => {
  const sources = ['declare function view(role: string): void;\ndeclare const X: number;\n'];
  const blocks = [{ line: 1, code: 'function view(role: string): void;\nconst X: number;' }];
  assert.deepEqual(unsampledBlocks(blocks, sources), []);
});

test('a block that drifted from every sample is reported', () => {
  const sources = ['const s = getState();\n'];
  assert.deepEqual(unsampledBlocks([{ line: 7, code: 'const s = getStat();' }], sources), [
    { line: 7, code: 'const s = getStat();' },
  ]);
});

test('every ts and tsx block in the repo docs is a typechecked sample', () => {
  assert.deepEqual(docSampleProblems(process.cwd()), []);
});
