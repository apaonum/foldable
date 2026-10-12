import { expect, test } from 'vitest';
import * as core from '@foldablejs/core';
import * as react from '../src/index';

test('re-exports SERVER_STATE and the helpers from core', () => {
  expect(react.SERVER_STATE).toBe(core.SERVER_STATE);
  expect(react.arrangement({ style: 'overlay', overlayState: 'expanded' })).toEqual({
    'data-foldable-arrangement': 'overlay',
    'data-foldable-overlay-state': 'expanded',
  });
  expect(react.view('secondary')).toEqual({ 'data-foldable-view': 'secondary' });
  expect(react.displace({ inline: 'leading' })).toEqual({ 'data-foldable-displace': 'leading' });
});
