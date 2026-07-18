export function useDebouncedCallback(fn: () => void, delay = 300) {
  let timeout: ReturnType<typeof setTimeout>;

  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, delay);
  };
}
