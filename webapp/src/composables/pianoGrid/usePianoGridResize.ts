import { ref, computed, type Ref } from "vue";
import type { MidiNote } from "../../lib/utils/types";

export interface ResizingState {
  startX: number;
  notesInitialWidth: Map<string, { width: number; x: number }>;
}

export function usePianoGridResize(
  notes: () => MidiNote[],
  selectedNotes: Ref<Set<string>>,
  colWidth: () => number,
  cols: () => number,
  onResizeEnd: (
    updates: Array<{ noteId: string; updates: Partial<MidiNote> }>,
  ) => void,
  onInteractionEnd: () => void,
  snapStep: () => number = () => 1,
) {
  const resizingState = ref<ResizingState | null>(null);
  const resizePreviewDelta = ref<number | null>(null);

  const isResizing = computed(() => resizingState.value !== null);

  const isNoteResizing = (noteId: string): boolean => {
    return resizingState.value?.notesInitialWidth.has(noteId) ?? false;
  };

  const handleResizeStart = (event: MouseEvent, note: MidiNote) => {
    event.preventDefault();
    event.stopPropagation();

    const notesInitialWidth = new Map<string, { width: number; x: number }>();

    if (selectedNotes.value.has(note.i)) {
      for (const n of notes()) {
        if (selectedNotes.value.has(n.i)) {
          notesInitialWidth.set(n.i, { width: n.w, x: n.x });
        }
      }
    } else {
      notesInitialWidth.set(note.i, { width: note.w, x: note.x });
    }

    resizingState.value = {
      startX: event.clientX,
      notesInitialWidth,
    };
    resizePreviewDelta.value = 0;
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (event: MouseEvent) => {
    if (!resizingState.value) return;

    const deltaX = event.clientX - resizingState.value.startX;
    const step = snapStep();
    const rawDeltaCols = Math.round(deltaX / colWidth() / step) * step;

    let minDelta = -Infinity;
    let maxDelta = Infinity;

    for (const [, info] of resizingState.value.notesInitialWidth) {
      minDelta = Math.max(minDelta, step - info.width);
      maxDelta = Math.min(maxDelta, cols() - info.x - info.width);
    }

    resizePreviewDelta.value = Math.max(
      minDelta,
      Math.min(maxDelta, rawDeltaCols),
    );
  };

  const handleResizeEnd = () => {
    if (resizingState.value && resizePreviewDelta.value !== null) {
      const delta = resizePreviewDelta.value;
      if (delta !== 0) {
        const updates: Array<{ noteId: string; updates: Partial<MidiNote> }> =
          [];
        for (const [noteId, info] of resizingState.value.notesInitialWidth) {
          updates.push({ noteId, updates: { w: info.width + delta } });
        }
        onResizeEnd(updates);
      }
      onInteractionEnd();
    }
    resizingState.value = null;
    resizePreviewDelta.value = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  return {
    resizingState,
    resizePreviewDelta,
    isResizing,
    isNoteResizing,
    handleResizeStart,
    cleanup,
  };
}
