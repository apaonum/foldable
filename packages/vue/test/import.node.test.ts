import { afterEach, expect, test } from 'vitest';
// Vue feature-detects `window` at load; preload it so the check covers only this adapter and core.
import 'vue';

const globals = globalThis as Record<string, unknown>;

afterEach(() => {
  delete globals.window;
  delete globals.document;
});

function recordingGlobal(name: string, touched: string[]): object {
  return new Proxy(
    {},
    {
      get: (_, key) => touched.push(`${name}.${String(key)}`),
      has: (_, key) => touched.push(`${name} has ${String(key)}`) > 0,
      set: (_, key) => touched.push(`${name}.${String(key)} =`) > 0,
    },
  );
}

test('importing the adapter touches no window or document', async () => {
  const touched: string[] = [];
  globals.window = recordingGlobal('window', touched);
  globals.document = recordingGlobal('document', touched);

  const mod: unknown = await import('../src/index');

  expect(mod).toBeTypeOf('object');
  expect(touched).toEqual([]);
});
