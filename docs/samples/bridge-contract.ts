// The Bridge Contract v1 shape quoted in docs/host.md, checked against the core's internal type.
import type { BridgeSnapshot as Internal } from '../../packages/core/src/bridge-global';

type Rect = { x: number; y: number; width: number; height: number };
type Insets = { top: number; right: number; bottom: number; left: number };
type BridgeSnapshot = {
  fold: Rect | null;
  sizeClass: 'compact' | 'regular';
  safeArea: Insets;
  layoutMargins: Insets;
  seq: number;
};

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const contractMatches: Same<BridgeSnapshot, Internal> = true;
