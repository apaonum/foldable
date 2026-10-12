import { useFoldable } from '@foldablejs/vue';
import { computed } from 'vue';

export function usePostureLabel() {
  const state = useFoldable();
  return computed(() => `${state.value.posture}, ${state.value.sizeClass}`);
}
