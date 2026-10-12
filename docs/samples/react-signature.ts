// Signature quoted in docs/js.md, checked against the real export.
import * as react from '@foldablejs/react';
import type { State } from '@foldablejs/react';

declare function useFoldable(): State;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const signatureMatches: Same<typeof useFoldable, typeof react.useFoldable> = true;
