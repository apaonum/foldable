import { expect, test } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import type { ShallowRef } from 'vue';
import { useFoldable } from '../src/index';
import type { State } from '../src/index';
import { bridgeFixtures } from '../../core/test/fixtures';
import { installBridge } from '../../core/test/support/install-bridge';

const [first] = bridgeFixtures;
if (first === undefined) throw new Error('no Bridge fixtures');
const bridge = installBridge({ ...first.snapshot, sizeClass: 'compact' });

test('the ref follows Bridge pushes and stops after unmount', async () => {
  let state: Readonly<ShallowRef<State>> | undefined;
  const App = defineComponent({
    setup() {
      state = useFoldable();
      return () => h('p', state?.value.sizeClass);
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(App);
  app.mount(host);

  expect(state?.value.source).toBe('bridge');
  expect(host.textContent).toBe('compact');

  bridge.push({ ...first.snapshot, sizeClass: 'regular' });
  await nextTick();
  expect(state?.value.sizeClass).toBe('regular');
  expect(host.textContent).toBe('regular');

  app.unmount();
  bridge.push({ ...first.snapshot, sizeClass: 'compact' });
  expect(state?.value.sizeClass).toBe('regular');
  host.remove();
});
