/** Publishes the primary's height as `--primary-height` on the Overlay box. */
export function trackPrimaryHeight(overlay: HTMLElement): () => void {
  const primary = overlay.querySelector('[data-foldable-view="primary"]');
  if (primary === null) return () => undefined;
  const observer = new ResizeObserver(([entry]) => {
    const height = entry?.borderBoxSize[0]?.blockSize ?? 0;
    overlay.style.setProperty('--primary-height', `${height}px`);
  });
  observer.observe(primary);
  return () => {
    observer.disconnect();
  };
}
