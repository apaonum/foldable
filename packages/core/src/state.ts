import { BRIDGE_GLOBAL } from './bridge-global';
import type { BridgeWindow } from './bridge-global';
import { applyCSS, toCSS } from './css';
import { posture, regions } from './derive';
import { SERVER_STATE } from './server-state';
import { bridgeReader } from './sources/bridge';
import { fallbackReader } from './sources/fallback';
import type { Reader } from './sources/reader';
import { webReader } from './sources/web';
import type { SegmentsWindow } from './sources/web';
import type { State } from './types';

type Listener = (state: State) => void;
type Store = { state: State; listeners: Set<Listener> };

let store: Store | undefined;

function chooseReader(win: BridgeWindow & SegmentsWindow): Reader {
  const bridge = win[BRIDGE_GLOBAL];
  if (bridge !== undefined) return bridgeReader(win, bridge);
  if (win.viewport?.segments !== undefined) return webReader(win);
  return fallbackReader(win);
}

function derive(reader: Reader, win: Window): State {
  const input = reader.read();
  return deepFreeze({
    posture: posture(input.fold),
    fold: input.fold === null ? null : { ...input.fold },
    regions: regions(input.fold, { width: win.innerWidth, height: win.innerHeight }),
    sizeClass: input.sizeClass,
    safeArea: { ...input.safeArea },
    layoutMargins: { ...input.layoutMargins },
    source: reader.source,
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// State is plain data built in a fixed key order, so JSON equality is exact.
const same = (a: State, b: State): boolean => JSON.stringify(a) === JSON.stringify(b);

function attach(win: Window): Store {
  const reader = chooseReader(win);
  const root = win.document.documentElement;
  const attached: Store = { state: derive(reader, win), listeners: new Set() };
  applyCSS(toCSS(attached.state), root);
  // Re-apply in the same task as the bootstrap's write so this core version owns the CSS.
  reader.listen(() => {
    const next = derive(reader, win);
    applyCSS(toCSS(next), root);
    if (same(next, attached.state)) return;
    attached.state = next;
    for (const listener of [...attached.listeners]) listener(next);
  });
  return attached;
}

function ensureStore(): Store | undefined {
  if (typeof window === 'undefined') return undefined;
  store ??= attach(window);
  return store;
}

export function getState(): State {
  return ensureStore()?.state ?? SERVER_STATE;
}

export function subscribe(listener: Listener): () => void {
  const current = ensureStore();
  if (current === undefined) return () => undefined;
  current.listeners.add(listener);
  return () => {
    current.listeners.delete(listener);
  };
}
