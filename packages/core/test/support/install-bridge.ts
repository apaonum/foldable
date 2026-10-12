// Internal test fake for the native Bridge; not published.
import bootstrapSource from '../../dist-iife/bootstrap.iife.js?raw';
import type { BridgeWindow } from '../../src/bridge-global';
import type { BridgeState } from '../../src/types';

export type FakeBridge = {
  /** Sends a full snapshot. `seq` defaults to one past the last one sent. */
  push(snapshot: BridgeState, seq?: number): void;
};

/** Runs the real bootstrap IIFE and seeds it, as the Bridge's document-start script does. */
export function installBridge(snapshot: BridgeState): FakeBridge {
  const script = document.createElement('script');
  script.textContent = bootstrapSource;
  document.head.append(script);
  script.remove();

  const bridge = (window as BridgeWindow).__foldableBridge;
  if (bridge === undefined) throw new Error('bootstrap did not define window.__foldableBridge');
  let lastSeq = 0;
  const push = (next: BridgeState, seq = lastSeq + 1): void => {
    lastSeq = Math.max(lastSeq, seq);
    bridge.receive({ ...next, seq });
  };
  push(snapshot);
  return { push };
}
