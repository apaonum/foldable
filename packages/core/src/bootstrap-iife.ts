// Entry of the bootstrap IIFE the Bridge injects at document start; never imported as ESM.
import { BRIDGE_CHANGE_EVENT, BRIDGE_GLOBAL, BRIDGE_VERSION } from './bridge-global';
import type { BridgeGlobal, BridgeSnapshot, BridgeWindow } from './bridge-global';
import { applyCSS, toCSS } from './css';
import { posture } from './derive';

function installBootstrap(win: BridgeWindow): void {
  if (BRIDGE_GLOBAL in win) return;
  const bridge: BridgeGlobal = {
    version: BRIDGE_VERSION,
    state: null,
    seq: 0,
    receive({ seq, ...state }: BridgeSnapshot) {
      if (seq <= bridge.seq) return;
      bridge.seq = seq;
      bridge.state = state;
      applyCSS(
        toCSS({ ...state, posture: posture(state.fold), source: 'bridge' }),
        win.document.documentElement,
      );
      win.dispatchEvent(new Event(BRIDGE_CHANGE_EVENT));
    },
  };
  Object.defineProperty(win, BRIDGE_GLOBAL, { value: bridge, enumerable: false });
}

installBootstrap(window);
