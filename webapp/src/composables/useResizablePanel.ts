import { ref, onUnmounted } from "vue";
import type { Ref } from "vue";
import { useUiLayoutPreference } from "./useUiLayoutStorage";

interface UseResizablePanelOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

interface UseResizablePanelReturn {
  width: Ref<number>;
  isResizing: Ref<boolean>;
  startResize: (event: MouseEvent) => void;
}

export function useResizablePanel(
  options: UseResizablePanelOptions,
): UseResizablePanelReturn {
  const { storageKey, defaultWidth, minWidth, maxWidth } = options;
  const clamp = (value: number): number =>
    Math.min(maxWidth, Math.max(minWidth, value));

  const width = useUiLayoutPreference(storageKey, defaultWidth);
  width.value = clamp(width.value);

  const isResizing = ref(false);
  let startX = 0;
  let startWidth = 0;

  const onMove = (event: MouseEvent): void => {
    width.value = clamp(startWidth + (event.clientX - startX));
  };

  const cleanup = (): void => {
    isResizing.value = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", cleanup);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const startResize = (event: MouseEvent): void => {
    event.preventDefault();
    startX = event.clientX;
    startWidth = width.value;
    isResizing.value = true;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", cleanup);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  onUnmounted(cleanup);

  return { width, isResizing, startResize };
}
