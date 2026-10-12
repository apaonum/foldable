/** The part of the layout viewport the software keyboard covers, in CSS px. */
export function keyboardInset(): number {
  const vv = window.visualViewport;
  if (vv === null) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

const publish = (): void => {
  document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset()}px`);
};
window.visualViewport?.addEventListener('resize', publish);
window.visualViewport?.addEventListener('scroll', publish);
