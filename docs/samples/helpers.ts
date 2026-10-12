import { arrangement, displace, view } from '@foldablejs/core';
import type { Attributes } from '@foldablejs/core';

arrangement({ style: 'split', axes: 'horizontal' });
// { 'data-foldable-arrangement': 'split', 'data-foldable-axes': 'horizontal' }
arrangement({ style: 'overlay', overlayEdge: { inline: 'leading', block: 'top' } });
// { 'data-foldable-arrangement': 'overlay', 'data-foldable-overlay-edge': 'leading top' }
arrangement({ style: 'overlay', overlayState: 'expanded' });
// { 'data-foldable-arrangement': 'overlay', 'data-foldable-overlay-state': 'expanded' }
view('primary'); // { 'data-foldable-view': 'primary' }
displace(); // { 'data-foldable-displace': '' }
displace({ block: 'top' }); // { 'data-foldable-displace': 'top' }

export function setAttributes(element: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}
