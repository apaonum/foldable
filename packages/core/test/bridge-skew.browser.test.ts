import { page } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { BRIDGE_CHANGE_EVENT } from '../src/bridge-global';
import type { BridgeWindow } from '../src/bridge-global';
import { getState } from '../src/index';
import { bridgeFixtures, skewFixtures } from './fixtures';
import { installBridge } from './support/install-bridge';

const [seed] = bridgeFixtures;
if (seed === undefined) throw new Error('no Bridge fixtures');
installBridge(seed.snapshot);
const global = (window as BridgeWindow).__foldableBridge;
if (global === undefined) throw new Error('bootstrap did not define window.__foldableBridge');

// Another bootstrap version may store a snapshot this core's bootstrap never would.
function foreignWrite(state: unknown): void {
  if (global === undefined) return;
  global.state = state;
  window.dispatchEvent(new Event(BRIDGE_CHANGE_EVENT));
}

const v1 = skewFixtures.filter((f) => f.expected.source === 'bridge');

describe.each(v1.map((f) => [f.name, f] as const))('skew %s', (_, f) => {
  test('getState() is the parsed Bridge state', async () => {
    await page.viewport(f.viewport.width, f.viewport.height);
    foreignWrite(f.sent);
    const state = getState();
    expect(state).toMatchObject({ ...f.expected.state, posture: f.expected.posture });
    expect(state.source).toBe('bridge');
    expect(state).not.toHaveProperty('hingeAngle');
    expect(document.documentElement.getAttribute('data-foldable-posture')).toBe(f.expected.posture);
  });
});
