// Lockstep release helpers. Run with Node 24 (type stripping): `node scripts/release.ts <command>`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const VERSION = /^\d+\.\d+\.\d+$/;
const TAG = /^v(\d+\.\d+\.\d+)$/;

interface Manifest {
  name: string;
  version?: string;
  private?: boolean;
}

function packageDirs(root: string): string[] {
  const packages = join(root, 'packages');
  return readdirSync(packages, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(packages, entry.name, 'package.json')),
    )
    .map((entry) => join(packages, entry.name))
    .filter((dir) => readManifest(dir).private !== true);
}

function readManifest(dir: string): Manifest {
  const path = join(dir, 'package.json');
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const manifest = parseManifest(raw);
  if (manifest === undefined) throw new Error(`${path} is not a valid package manifest`);
  return manifest;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function parseManifest(raw: unknown): Manifest | undefined {
  if (!isRecord(raw)) return undefined;
  const { name, version, private: isPrivate } = raw;
  if (typeof name !== 'string') return undefined;
  if (version !== undefined && typeof version !== 'string') return undefined;
  if (isPrivate !== undefined && typeof isPrivate !== 'boolean') return undefined;
  return {
    name,
    ...(version === undefined ? {} : { version }),
    ...(isPrivate === undefined ? {} : { private: isPrivate }),
  };
}

export function checklistPath(root: string, version: string): string {
  return join(root, 'docs', 'manual-checks', `v${version}.md`);
}

/** Sets `version` on every published package; workspace:* deps are pinned to it by `pnpm pack`. */
export function bumpVersion(root: string, version: string): void {
  if (!VERSION.test(version)) throw new Error(`Expected X.Y.Z, got "${version}"`);
  for (const dir of packageDirs(root)) {
    const path = join(dir, 'package.json');
    const manifest: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!isRecord(manifest) || typeof manifest.version !== 'string')
      throw new Error(`${path} is not a valid package manifest`);
    manifest.version = version;
    writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
  }
}

/** Returns why `tag` must not be published; empty means it may. */
export function releaseProblems(root: string, tag: string): string[] {
  const version = TAG.exec(tag)?.[1];
  if (version === undefined) return [`Tag "${tag}" is not vX.Y.Z`];

  const problems: string[] = [];
  for (const dir of packageDirs(root)) {
    const { name, version: actual } = readManifest(dir);
    if (actual !== version) problems.push(`${name} is at ${String(actual)}, not ${version}`);
  }

  const checklist = checklistPath(root, version);
  if (!existsSync(checklist)) {
    problems.push(`Manual checklist docs/manual-checks/v${version}.md is not committed`);
  } else {
    const unchecked = readFileSync(checklist, 'utf8').match(/^\s*[-*] \[ \]/gm)?.length ?? 0;
    if (unchecked > 0) {
      problems.push(
        `Manual checklist docs/manual-checks/v${version}.md has ${unchecked} unchecked item${unchecked === 1 ? '' : 's'}`,
      );
    }
  }
  return problems;
}

const ALLOWED_IN_TARBALL = [
  /^package\/package\.json$/,
  /^package\/(LICENSE|README\.md)$/,
  /^package\/dist\/[\w.-]+\.(mjs|d\.mts)$/,
  /^package\/dist\/primitives\.css$/,
];

/** Returns tarball entries (as listed by `tar -tzf`) that aren't built ESM, types, `primitives.css` or metadata. */
export function unexpectedTarballEntries(entries: readonly string[]): string[] {
  return entries.filter((entry) => !ALLOWED_IN_TARBALL.some((pattern) => pattern.test(entry)));
}

function main(args: readonly string[]): number {
  const root = process.cwd();
  const [command, value] = args;
  switch (command) {
    case 'bump': {
      bumpVersion(root, value ?? '');
      console.log(`Set every published package to ${String(value)}.`);
      return 0;
    }
    case 'check': {
      const problems = releaseProblems(root, value ?? '');
      for (const problem of problems) console.error(`✗ ${problem}`);
      if (problems.length === 0) console.log(`✓ ${String(value)} may be published.`);
      return problems.length === 0 ? 0 : 1;
    }
    case 'check-tarball': {
      const stdin = readFileSync(0, 'utf8');
      const extra = unexpectedTarballEntries(stdin.split('\n').filter((line) => line !== ''));
      for (const entry of extra) console.error(`✗ unexpected file in tarball: ${entry}`);
      return extra.length === 0 ? 0 : 1;
    }
    default: {
      console.error(
        'Usage: node scripts/release.ts bump X.Y.Z | check vX.Y.Z | check-tarball < <(tar -tzf pkg.tgz)',
      );
      return 2;
    }
  }
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
