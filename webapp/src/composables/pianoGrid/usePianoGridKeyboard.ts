import { onMounted, onBeforeUnmount, type Ref } from "vue";

export interface KeyboardActions {
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onMoveSelection: (
    dx: number,
    dy: number,
    horizontalUnit?: "step" | "bar",
  ) => void;
}

// Contrairement à TimelineView.vue::isTypingTarget (qui exclut exprès
// type="number" car la barre espace y est inerte), les flèches ne le sont
// jamais sur un input (Haut/Bas incrémentent, Gauche/Droite déplacent le
// curseur texte) : tout HTMLInputElement doit être traité comme une cible de
// saisie ici, quel que soit son type.
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  return target.tagName === "TEXTAREA" || target.isContentEditable;
};

export function usePianoGridKeyboard(
  selectedNotes: Ref<Set<string>>,
  actions: KeyboardActions,
) {
  const handleKeydown = (event: KeyboardEvent) => {
    // Undo: Ctrl/Cmd + Z (without Shift)
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      actions.onUndo();
      return;
    }

    // Redo: Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y
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

    // Delete/Backspace: delete selected notes
    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      selectedNotes.value.size > 0
    ) {
      event.preventDefault();
      actions.onDelete();
      return;
    }

    // Escape: clear selection
    if (event.key === "Escape") {
      actions.onEscape();
      return;
    }

    // Ctrl/Cmd + C: copy
    if ((event.ctrlKey || event.metaKey) && event.key === "c") {
      event.preventDefault();
      actions.onCopy();
      return;
    }

    // Ctrl/Cmd + V: paste
    if ((event.ctrlKey || event.metaKey) && event.key === "v") {
      event.preventDefault();
      actions.onPaste();
      return;
    }

    // Ctrl/Cmd + D: duplicate
    if ((event.ctrlKey || event.metaKey) && event.key === "d") {
      event.preventDefault();
      actions.onDuplicate();
      return;
    }

    // Arrow keys move the selection: plain (or Shift) = 1 step,
    // Ctrl/Cmd + vertical = 1 octave, Ctrl/Cmd + horizontal = 1 mesure
    if (selectedNotes.value.size > 0) {
      const isArrowKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(event.key);

      if (isArrowKey && !isTypingTarget(event.target)) {
        event.preventDefault();

        // Ctrl/Cmd + Arrow: octave verticalement, mesure horizontalement
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
          switch (event.key) {
            case "ArrowUp":
              actions.onMoveSelection(0, -12);
              break;
            case "ArrowDown":
              actions.onMoveSelection(0, 12);
              break;
            case "ArrowLeft":
              actions.onMoveSelection(-1, 0, "bar");
              break;
            case "ArrowRight":
              actions.onMoveSelection(1, 0, "bar");
              break;
          }
          return;
        }

        // Plain Arrow (or Shift + Arrow): move by 1 step
        switch (event.key) {
          case "ArrowUp":
            actions.onMoveSelection(0, -1);
            break;
          case "ArrowDown":
            actions.onMoveSelection(0, 1);
            break;
          case "ArrowLeft":
            actions.onMoveSelection(-1, 0);
            break;
          case "ArrowRight":
            actions.onMoveSelection(1, 0);
            break;
        }
        return;
      }
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
}
