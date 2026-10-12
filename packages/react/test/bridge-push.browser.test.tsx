import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import bookRegular from '../../../fixtures/bridge/book-regular.json';
import type { BridgeState } from '../../core/src/types';
import { installBridge } from '../../core/test/support/install-bridge';
import { useFoldable } from '../src/index';
import type { SizeClass } from '../src/index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = bookRegular.snapshot as BridgeState;

test('useFoldable() updates on an installBridge push and stops after unmount', () => {
  const bridge = installBridge({ ...snapshot, sizeClass: 'compact' });
  const seen: SizeClass[] = [];
  function Probe() {
    const state = useFoldable();
    seen.push(state.sizeClass);
    return <p>{state.sizeClass}</p>;
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Probe />);
  });
  expect(container.textContent).toBe('compact');

  act(() => {
    bridge.push({ ...snapshot, sizeClass: 'regular' });
  });
  expect(container.textContent).toBe('regular');

  act(() => {
    root.unmount();
  });
  act(() => {
    bridge.push({ ...snapshot, sizeClass: 'compact' });
  });

  expect(seen).toEqual(['compact', 'regular']);
  expect(container.textContent).toBe('');
});
