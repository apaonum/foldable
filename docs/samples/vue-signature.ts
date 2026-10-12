// Signature quoted in docs/js.md, checked against the real export.
import * as adapter from '@foldablejs/vue';
import type { State } from '@foldablejs/vue';
import type { ShallowRef } from 'vue';

declare function useFoldable(): Readonly<ShallowRef<State>>;

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const signatureMatches: Same<typeof useFoldable, typeof adapter.useFoldable> = true;
