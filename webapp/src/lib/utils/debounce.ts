// Debounce générique : `schedule()` (re)lance le timer, `flush()` exécute
// immédiatement s'il y a un timer en attente (ex. sur beforeunload, pour ne
// rien perdre si l'onglet se ferme juste après un schedule()).
export function createDebouncer(
  fn: () => void,
  ms: number,
): { schedule: () => void; flush: () => void } {
  let id: ReturnType<typeof setTimeout> | null = null;
  const schedule = (): void => {
    if (id) clearTimeout(id);
    id = setTimeout(() => {
      id = null;
      fn();
    }, ms);
  };
  const flush = (): void => {
    if (!id) return;
    clearTimeout(id);
    id = null;
    fn();
  };
  return { schedule, flush };
}
