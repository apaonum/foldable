import { expect, test } from 'vitest';
import * as core from '@foldablejs/core';
import * as vue from '../src/index';

test('re-exports SERVER_STATE and the helpers from core', () => {
  expect(vue.SERVER_STATE).toBe(core.SERVER_STATE);
  expect(vue.arrangement({ style: 'split', axes: 'vertical' })).toEqual({
    'data-foldable-arrangement': 'split',
    'data-foldable-axes': 'vertical',
  });
  expect(vue.view('primary')).toEqual({ 'data-foldable-view': 'primary' });
  expect(vue.displace({ block: 'bottom' })).toEqual({ 'data-foldable-displace': 'bottom' });
});
