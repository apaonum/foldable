import type { BridgeState, Source } from '../types';

/**
 * One state source. The core picks a reader once, on first use, and derives
 * Posture and Regions from what it reads.
 */
export type Reader = Readonly<{
  source: Source;
  read(): BridgeState;
  /** Calls `onChange` whenever `read()` may return something new. */
  listen(onChange: () => void): void;
}>;
