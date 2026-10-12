import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { bumpVersion, releaseProblems, unexpectedTarballEntries } from './release.ts';

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function readVersion(path: string): unknown {
  return (JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown }).version;
}

function fakeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'foldable-release-'));
  writeJson(join(root, 'packages/core/package.json'), {
    name: '@foldablejs/core',
    version: '0.0.0',
  });
  writeJson(join(root, 'packages/react/package.json'), {
    name: '@foldablejs/react',
    version: '0.0.0',
    dependencies: { '@foldablejs/core': 'workspace:*' },
  });
  writeJson(join(root, 'packages/vue/package.json'), { name: '@foldablejs/vue', version: '0.0.0' });
  writeJson(join(root, 'examples/next/package.json'), { name: 'example-next', private: true });
  return root;
}

test('bumpVersion sets one version on every published package', () => {
  const root = fakeRepo();

  bumpVersion(root, '0.1.0');

  assert.equal(readVersion(join(root, 'packages/core/package.json')), '0.1.0');
  assert.equal(readVersion(join(root, 'packages/react/package.json')), '0.1.0');
  assert.equal(readVersion(join(root, 'packages/vue/package.json')), '0.1.0');
  assert.equal(readVersion(join(root, 'examples/next/package.json')), undefined);
});

test('bumpVersion rejects a version that is not X.Y.Z', () => {
  const root = fakeRepo();

  assert.throws(() => {
    bumpVersion(root, 'v0.1.0');
  }, /Expected X\.Y\.Z/);
  assert.equal(readVersion(join(root, 'packages/core/package.json')), '0.0.0');
});

function writeChecklist(root: string, version: string, body: string): void {
  mkdirSync(join(root, 'docs/manual-checks'), { recursive: true });
  writeFileSync(join(root, `docs/manual-checks/v${version}.md`), body);
}

test('a release is refused when its manual checklist is missing', () => {
  const root = fakeRepo();
  bumpVersion(root, '0.1.0');

  assert.deepEqual(releaseProblems(root, 'v0.1.0'), [
    'Manual checklist docs/manual-checks/v0.1.0.md is not committed',
  ]);
});

test('a release is refused while its checklist has unchecked items', () => {
  const root = fakeRepo();
  bumpVersion(root, '0.1.0');
  writeChecklist(root, '0.1.0', '- [x] book, inner, Split\n- [ ] tabletop, inner, Split\n');

  assert.deepEqual(releaseProblems(root, 'v0.1.0'), [
    'Manual checklist docs/manual-checks/v0.1.0.md has 1 unchecked item',
  ]);
});

test('a release is refused when a package version does not match the tag', () => {
  const root = fakeRepo();
  bumpVersion(root, '0.1.0');
  writeChecklist(root, '0.2.0', '- [x] book, inner, Split\n');

  assert.deepEqual(releaseProblems(root, 'v0.2.0'), [
    '@foldablejs/core is at 0.1.0, not 0.2.0',
    '@foldablejs/react is at 0.1.0, not 0.2.0',
    '@foldablejs/vue is at 0.1.0, not 0.2.0',
  ]);
});

test('a release is refused for a tag that is not vX.Y.Z', () => {
  assert.deepEqual(releaseProblems(fakeRepo(), 'v0.1'), ['Tag "v0.1" is not vX.Y.Z']);
});

test('a bumped release with a completed checklist may be published', () => {
  const root = fakeRepo();
  bumpVersion(root, '0.1.0');
  writeChecklist(root, '0.1.0', '- [x] book, inner, Split\n- [X] tabletop, inner, Split\n');

  assert.deepEqual(releaseProblems(root, 'v0.1.0'), []);
});

test('tarballs may hold only built ESM, types, primitives.css and package metadata', () => {
  const entries = [
    'package/package.json',
    'package/LICENSE',
    'package/dist/index.mjs',
    'package/dist/index.d.mts',
    'package/dist/derive-BaeVdj7M.mjs',
    'package/dist/primitives.css',
    'package/dist/other.css',
    'package/src/index.ts',
    'package/dist/index.mjs.map',
  ];

  assert.deepEqual(unexpectedTarballEntries(entries), [
    'package/dist/other.css',
    'package/src/index.ts',
    'package/dist/index.mjs.map',
  ]);
});

test('releaseProblems rejects a malformed package.json, naming the file', () => {
  for (const manifest of [[], { version: '0.1.0' }, { name: 2 }, { name: 'x', version: 1 }]) {
    const root = fakeRepo();
    writeJson(join(root, 'packages/vue/package.json'), manifest);

    assert.throws(
      () => releaseProblems(root, 'v0.1.0'),
      /packages\/vue\/package\.json is not a valid package manifest/,
    );
  }
});

test('bumpVersion refuses a published package with no version, naming the file', () => {
  const root = fakeRepo();
  writeJson(join(root, 'packages/vue/package.json'), { name: '@foldablejs/vue' });

  assert.throws(() => {
    bumpVersion(root, '0.1.0');
  }, /packages\/vue\/package\.json has no version/);
});

test('bumpVersion keeps every other manifest field', () => {
  const root = fakeRepo();

  bumpVersion(root, '0.1.0');

  const react: unknown = JSON.parse(
    readFileSync(join(root, 'packages/react/package.json'), 'utf8'),
  );
  assert.deepEqual(react, {
    name: '@foldablejs/react',
    version: '0.1.0',
    dependencies: { '@foldablejs/core': 'workspace:*' },
  });
});
