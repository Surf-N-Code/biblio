/** Use the visible viewport, including Safari's keyboard-induced viewport offset. */
export function drawerViewportBounds(layoutHeight: number, height: number, offsetTop: number) {
  return { maxHeight: Math.max(0, height - 16), bottom: Math.max(0, layoutHeight - height - offsetTop) };
}

/** Scroll only the drawer, never the document behind it. */
export function focusedControlScrollDelta(top: number, bottom: number, visibleTop: number, visibleBottom: number) {
  if (top < visibleTop) return top - visibleTop;
  if (bottom > visibleBottom) return Math.min(bottom - visibleBottom, top - visibleTop);
  return 0;
}
