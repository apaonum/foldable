import { getState, subscribe } from '@foldablejs/core';

const state = getState();
console.log(state.posture, state.sizeClass, state.regions.length, state.source);

const unsubscribe = subscribe((next) => {
  console.log('Posture is now', next.posture);
});
// Later, to stop listening:
unsubscribe();
