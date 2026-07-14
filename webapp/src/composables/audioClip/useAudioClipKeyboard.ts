import { onMounted, onBeforeUnmount, type Ref } from "vue";

export interface KeyboardActions {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
}

export function useAudioClipKeyboard(
  selectedClipIds: Ref<Set<string>>,
  actions: KeyboardActions,
  isActive: Ref<boolean>,
) {
  const handleKeydown = (event: KeyboardEvent) => {
    if (!isActive.value) return;

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      actions.onUndo();
      return;
    }

    if (
      ((event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "z") ||
      ((event.ctrlKey || event.metaKey) && event.key === "y")
    ) {
      event.preventDefault();
      actions.onRedo();
      return;
    }

    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      selectedClipIds.value.size > 0
    ) {
      event.preventDefault();
      actions.onDelete();
      return;
    }

    if (event.key === "Escape") {
      actions.onEscape();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "c") {
      event.preventDefault();
      actions.onCopy();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "v") {
      event.preventDefault();
      actions.onPaste();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "d") {
      event.preventDefault();
      actions.onDuplicate();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "e") {
      event.preventDefault();
      actions.onSplit();
      return;
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
}
