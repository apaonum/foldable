// Signatures quoted in docs/js.md, each checked against the real export.
import * as core from '@foldablejs/core';
import type { Attributes, State } from '@foldablejs/core';

declare function getState(): State;
declare function subscribe(listener: (state: State) => void): () => void;
declare const SERVER_STATE: State;

declare type Edge = { inline?: 'leading' | 'trailing'; block?: 'top' | 'bottom' };

declare function arrangement(
  options:
    | { style: 'split'; axes?: 'horizontal' | 'vertical' }
    | { style: 'overlay'; overlayEdge?: Edge; overlayState?: 'collapsed' | 'expanded' },
): Attributes;
declare function view(role: 'primary' | 'secondary'): Attributes;
declare function displace(edge?: Edge): Attributes;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const signaturesMatch: [
  Same<typeof getState, typeof core.getState>,
  Same<typeof subscribe, typeof core.subscribe>,
  Same<typeof SERVER_STATE, typeof core.SERVER_STATE>,
  Same<typeof arrangement, typeof core.arrangement>,
  Same<typeof view, typeof core.view>,
  Same<typeof displace, typeof core.displace>,
] = [true, true, true, true, true, true];
