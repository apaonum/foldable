import { afterEach, expect, test } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import type { ShallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';
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
  const seen: State[] = [];
  const loaded: { useFoldable?: () => Readonly<ShallowRef<State>> } = {};
  const App = defineComponent({
    setup() {
      if (loaded.useFoldable === undefined) throw new Error('useFoldable not loaded');
      const state = loaded.useFoldable();
      return () => {
        seen.push(state.value);
        return h('p', `${state.value.posture} ${state.value.source}`);
      };
    },
  });
  // Vue's own dev devtools hook reads `window` in createSSRApp, so the app exists before
  // recording starts; everything foldable does (import, setup, render) is recorded.
  const app = createSSRApp(App);

  const touched: string[] = [];
  // A defined window proves the composable doesn't rely on `typeof window` to stay on the server path.
  globals.window = recordingGlobal('window', touched);
  globals.document = recordingGlobal('document', touched);
  const foldable = await import('../src/index');
  loaded.useFoldable = foldable.useFoldable;
  const html = await renderToString(app);

  expect(touched).toEqual([]);
  expect(seen).toHaveLength(1);
  expect(seen[0]).toBe(foldable.SERVER_STATE);
  expect(html).toBe('<p>none fallback</p>');
});
