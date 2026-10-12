import { BRIDGE_CHANGE_EVENT } from '../bridge-global';
import type { BridgeGlobal } from '../bridge-global';
import type { BridgeState } from '../types';
import type { Reader } from './reader';

const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };

// shortcut: trusts the snapshot shape; #30 replaces this with boundary parsing and version skew.
function parse(raw: unknown): BridgeState {
  if (raw === null || typeof raw !== 'object') {
    return { fold: null, sizeClass: 'compact', safeArea: ZERO, layoutMargins: ZERO };
  }
  const { fold, sizeClass, safeArea, layoutMargins } = raw as BridgeState;
  return { fold, sizeClass, safeArea, layoutMargins };
}

export function bridgeReader(win: Window, bridge: BridgeGlobal): Reader {
  return {
    source: 'bridge',
    read: () => parse(bridge.state),
    listen: (onChange) => {
      win.addEventListener(BRIDGE_CHANGE_EVENT, onChange);
    },
  };
}
