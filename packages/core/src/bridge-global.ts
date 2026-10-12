import type { BridgeState } from './types';

/** Frozen in v1: the global name, its members, and the event name. */
export const BRIDGE_GLOBAL = '__foldableBridge';
export const BRIDGE_CHANGE_EVENT = '__foldablebridgechange';
export const BRIDGE_VERSION = 1;

/**
 * The Bridge's seed is always `seq` 1 (Swift `seedSeq` in Seed.swift); the global starts one
 * below so the seed applies and every live push continues above it. SeedTests guards the pair.
 */
export const SEED_SEQ = 1;

export type BridgeSnapshot = BridgeState & { seq: number };

export type BridgeGlobal = {
  readonly version: number;
  /** `null` until the first `receive`; the Bridge seeds one right after the bootstrap. */
  state: unknown;
  seq: number;
  receive(snapshot: BridgeSnapshot): void;
};

export type BridgeWindow = Window & { [BRIDGE_GLOBAL]?: BridgeGlobal };
