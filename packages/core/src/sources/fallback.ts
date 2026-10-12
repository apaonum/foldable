import { approximateLayoutMargins, environment } from './environment';
import type { Reader } from './reader';

/** No Bridge and no Viewport Segments: the page's own Size Class, safe area and margins. */
export function fallbackReader(win: Window): Reader {
  const env = environment(win);
  return {
    source: 'fallback',
    read: () => {
      const safeArea = env.safeArea();
      return {
        fold: null,
        sizeClass: env.sizeClass(),
        safeArea,
        layoutMargins: approximateLayoutMargins(safeArea),
      };
    },
    listen: env.listen,
  };
}
