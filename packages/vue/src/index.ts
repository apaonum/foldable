import { getState, SERVER_STATE, subscribe } from '@foldablejs/core';
import type { State } from '@foldablejs/core';
import { onMounted, onUnmounted, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';

export { arrangement, displace, SERVER_STATE, view } from '@foldablejs/core';
export type { Attributes, Insets, Posture, Rect, SizeClass, Source, State } from '@foldablejs/core';

/**
 * Starts at SERVER_STATE so server and hydration renders match; reads the live
 * state only once mounted, which never happens during SSR.
 */
export function useFoldable(): Readonly<ShallowRef<State>> {
  const state = shallowRef<State>(SERVER_STATE);
  let unsubscribe: (() => void) | undefined;
  onMounted(() => {
    state.value = getState();
    unsubscribe = subscribe((next) => {
      state.value = next;
    });
  });
  onUnmounted(() => {
    unsubscribe?.();
  });
  return state;
}
