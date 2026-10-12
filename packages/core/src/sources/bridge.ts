import { BRIDGE_CHANGE_EVENT, BRIDGE_VERSION } from '../bridge-global';
import type { BridgeGlobal } from '../bridge-global';
import type { BridgeState, Insets, Rect, SizeClass } from '../types';
import { approximateLayoutMargins, environment } from './environment';
import type { Environment } from './environment';
import { fallbackReader } from './fallback';
import type { Reader } from './reader';

type Fields = Readonly<Record<string, unknown>>;

/** Read off the foreign global, so it may be anything a newer or older bootstrap set. */
export const isSupportedVersion = (version: unknown): boolean => version === BRIDGE_VERSION;

const isFields = (value: unknown): value is Fields =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseSizeClass = (value: unknown): SizeClass => (value === 'regular' ? 'regular' : 'compact');

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function parseRect(value: unknown): Rect | null {
  if (!isFields(value)) return null;
  const { x, y, width, height } = value;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  if (!isFiniteNumber(width) || !isFiniteNumber(height)) return null;
  return { x, y, width, height };
}

function parseInsets(value: unknown): Insets | null {
  if (!isFields(value)) return null;
  const { top, right, bottom, left } = value;
  if (!isFiniteNumber(top) || !isFiniteNumber(right)) return null;
  if (!isFiniteNumber(bottom) || !isFiniteNumber(left)) return null;
  return { top, right, bottom, left };
}

/**
 * Bridge Contract v1 boundary. Within v1 the contract is additive only, so an
 * older or newer bootstrap may send fields this core doesn't know or omit ones
 * it expects; each bad field falls back to what `web`/`fallback` would report.
 */
export function parseSnapshot(raw: unknown, env: Pick<Environment, 'safeArea'>): BridgeState {
  const fields: Fields = isFields(raw) ? raw : {};
  // Only probe when needed: the probe inserts an element into the page.
  const safeArea = parseInsets(fields.safeArea) ?? env.safeArea();
  return {
    fold: parseRect(fields.fold),
    sizeClass: parseSizeClass(fields.sizeClass),
    safeArea,
    layoutMargins: parseInsets(fields.layoutMargins) ?? approximateLayoutMargins(safeArea),
  };
}

export function bridgeReader(win: Window, bridge: BridgeGlobal): Reader {
  if (!isSupportedVersion(bridge.version)) {
    const fallback = fallbackReader(win);
    return {
      ...fallback,
      listen: (onChange) => {
        fallback.listen(onChange);
        // The bootstrap still writes its own CSS on every receive; re-applying ours
        // in the same task keeps <html> on this core's fallback output.
        win.addEventListener(BRIDGE_CHANGE_EVENT, onChange);
      },
    };
  }
  const env = environment(win);
  return {
    source: 'bridge',
    read: () => parseSnapshot(bridge.state, env),
    listen: (onChange) => {
      win.addEventListener(BRIDGE_CHANGE_EVENT, onChange);
    },
  };
}
