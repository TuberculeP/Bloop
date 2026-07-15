// Regroupe un flot d'appels synchrones (mousemove, scroll, zoom...) en au plus
// un seul appel de `fn` par frame d'animation, via un simple gate booléen +
// requestAnimationFrame.
export function useRafSchedule(fn: () => void): () => void {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      fn();
      scheduled = false;
    });
  };
}
