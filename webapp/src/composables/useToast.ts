import { reactive } from "vue";

export interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const toasts = reactive<Toast[]>([]);
let nextId = 0;

function dismiss(id: number) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

function push(type: Toast["type"], message: string, duration = 4000) {
  const id = nextId++;
  toasts.push({ id, type, message });
  setTimeout(() => dismiss(id), duration);
}

export function useToast() {
  return {
    toasts,
    success: (message: string, duration?: number) =>
      push("success", message, duration),
    error: (message: string, duration?: number) =>
      push("error", message, duration),
    info: (message: string, duration?: number) =>
      push("info", message, duration),
    dismiss,
  };
}
