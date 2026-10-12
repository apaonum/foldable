import { expect, test } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { SERVER_STATE, useFoldable } from '../src/index';
import type { State } from '../src/index';

test('server render sees SERVER_STATE without a window', async () => {
  let seen: State | undefined;
  const App = defineComponent({
    setup() {
      const state = useFoldable();
      return () => {
        seen = state.value;
        return h('p', `${state.value.posture} ${state.value.source}`);
      };
    },
  });

  const html = await renderToString(createSSRApp(App));

  expect(typeof window).toBe('undefined');
  expect(html).toBe('<p>none fallback</p>');
  expect(seen).toBe(SERVER_STATE);
});
