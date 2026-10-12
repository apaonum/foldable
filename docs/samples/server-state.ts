import { getState, SERVER_STATE } from '@foldablejs/core';

export function postureLabel(): string {
  const state = getState();
  return state === SERVER_STATE ? 'not known yet' : state.posture;
}
