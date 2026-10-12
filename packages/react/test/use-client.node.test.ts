import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test("the built entry starts with 'use client' so the App Router can import it", () => {
  const entry = readFileSync(new URL('../dist/index.mjs', import.meta.url), 'utf8');
  expect(entry).toMatch(/^["']use client["'];/);
});
