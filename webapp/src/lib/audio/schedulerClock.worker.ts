// Ticks the playback scheduler from a worker: main-thread timers are
// throttled in background tabs, worker timers are not.
let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (event: MessageEvent<{ intervalMs: number } | "stop">) => {
  if (intervalId !== null) clearInterval(intervalId);
  intervalId = null;
  if (event.data === "stop") return;
  intervalId = setInterval(
    () => self.postMessage("tick"),
    event.data.intervalMs,
  );
};
