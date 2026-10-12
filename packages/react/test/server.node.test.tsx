import { renderToString } from 'react-dom/server';
import { afterEach, expect, test } from 'vitest';
import type { State } from '../src/index';

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

test('a server render returns SERVER_STATE and never touches window', async () => {
  const touched: string[] = [];
  // A defined window proves the hook doesn't rely on `typeof window` to stay on the server path.
  globals.window = recordingGlobal('window', touched);
  globals.document = recordingGlobal('document', touched);
  const { useFoldable, SERVER_STATE } = await import('../src/index');

  const seen: State[] = [];
  function Probe() {
    const state = useFoldable();
    seen.push(state);
    return <p>{state.posture}</p>;
  }
  const html = renderToString(<Probe />);

  expect(touched).toEqual([]);
  expect(seen).toHaveLength(1);
  expect(seen[0]).toBe(SERVER_STATE);
  expect(html).toBe('<p>none</p>');
});
