'use client';

import { getState, SERVER_STATE, subscribe } from '@foldablejs/core';
import type { State } from '@foldablejs/core';
import { useSyncExternalStore } from 'react';

export { arrangement, displace, SERVER_STATE, view } from '@foldablejs/core';
export type { Attributes, Insets, Posture, Rect, SizeClass, Source, State } from '@foldablejs/core';

const getServerState = (): State => SERVER_STATE;

/** Current foldable state; `SERVER_STATE` during SSR and hydration, then live. */
export function useFoldable(): State {
  return useSyncExternalStore(subscribe, getState, getServerState);
}
