import { subscribe } from '@foldablejs/core';

/** Moves focus to `fallback` when an Arrangement change hides the last focused element. */
export function restoreFocus(fallback: HTMLElement): () => void {
  let last: Element | null = null;
  const remember = (event: FocusEvent): void => {
    if (event.target instanceof Element) last = event.target;
  };
  const check = (): void => {
    if (last !== null && last.isConnected && !last.checkVisibility()) {
      last = null;
      fallback.focus();
    }
  };
  document.addEventListener('focusin', remember);
  // The box can change aspect ratio with no state change, so check on resize too.
  window.addEventListener('resize', check);
  const unsubscribe = subscribe(check);
  return () => {
    document.removeEventListener('focusin', remember);
    window.removeEventListener('resize', check);
    unsubscribe();
  };
}
