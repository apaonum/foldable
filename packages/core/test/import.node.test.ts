import { afterEach, expect, test } from 'vitest';

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

test.each(['../src/index', '../src/bootstrap'])(
  'importing %s touches no window or document',
  async (path) => {
    const touched: string[] = [];
    globals.window = recordingGlobal('window', touched);
    globals.document = recordingGlobal('document', touched);

    const mod: unknown = await import(path);

    expect(mod).toBeTypeOf('object');
    expect(touched).toEqual([]);
  },
);

test('the bootstrap subpath exposes only toCSS and applyCSS', async () => {
  const mod = await import('../src/bootstrap');
  expect(Object.keys(mod).sort()).toEqual(['applyCSS', 'toCSS']);
});
