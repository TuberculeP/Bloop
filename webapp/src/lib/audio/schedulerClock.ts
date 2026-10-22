import SchedulerClockWorker from "./schedulerClock.worker.ts?worker";

export interface SchedulerClock {
  start(): void;
  stop(): void;
  dispose(): void;
}

// Calls `onTick` every `intervalMs`, from a worker timer when available
// (keeps running in background tabs), else from setInterval.
export function createSchedulerClock(
  intervalMs: number,
  onTick: () => void,
): SchedulerClock {
  let worker: Worker | null = null;
  try {
    worker = new SchedulerClockWorker();
    worker.onmessage = () => onTick();
  } catch {
    worker = null;
  }

  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (worker) {
        worker.postMessage({ intervalMs });
        return;
      }
      if (intervalId === null) intervalId = setInterval(onTick, intervalMs);
    },
    stop() {
      if (worker) {
        worker.postMessage("stop");
        return;
      }
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = null;
    },
    dispose() {
      this.stop();
      worker?.terminate();
      worker = null;
    },
  };
}
