import { ref, computed, type Ref } from "vue";
import type { MidiNote } from "../../lib/utils/types";
import {
  NOTE_ROW_HEIGHT,
  TOTAL_NOTES,
} from "../../lib/audio/pianoRollConstants";

export interface DragState {
  startMouseX: number;
  startMouseY: number;
  clickedNoteId: string;
  wasSelected: boolean;
  hasMoved: boolean;
  notesInitialPos: Map<string, { x: number; y: number; w: number }>;
}

export function usePianoGridDrag(
  notes: () => MidiNote[],
  selectedNotes: Ref<Set<string>>,
  colWidth: () => number,
  cols: () => number,
  onDragEnd: (
    updates: Array<{ noteId: string; updates: Partial<MidiNote> }>,
  ) => void,
  onInteractionEnd: () => void,
  snapStep: () => number = () => 1,
) {
  const dragState = ref<DragState | null>(null);
  const dragPreviewDeltas = ref<{ dx: number; dy: number } | null>(null);

  const isDragging = computed(() => dragState.value !== null);

  const isNoteDragging = (noteId: string): boolean => {
    return dragState.value?.notesInitialPos.has(noteId) ?? false;
  };

  const handleDragStart = (event: MouseEvent, note: MidiNote) => {
    if ((event.target as HTMLElement).classList.contains("resize-handle"))
      return;
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();

    const wasSelected = selectedNotes.value.has(note.i);

    const notesInitialPos = new Map<
      string,
      { x: number; y: number; w: number }
    >();

    if (wasSelected) {
      for (const n of notes()) {
        if (selectedNotes.value.has(n.i)) {
          notesInitialPos.set(n.i, { x: n.x, y: n.y, w: n.w });
        }
      }
    } else {
      notesInitialPos.set(note.i, { x: note.x, y: note.y, w: note.w });
    }

    dragState.value = {
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      clickedNoteId: note.i,
      wasSelected,
      hasMoved: false,
      notesInitialPos,
    };
    dragPreviewDeltas.value = { dx: 0, dy: 0 };

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = (event: MouseEvent) => {
    if (!dragState.value) return;

    const deltaX = event.clientX - dragState.value.startMouseX;
    const deltaY = event.clientY - dragState.value.startMouseY;
    const step = snapStep();
    const rawDeltaCols = Math.round(deltaX / colWidth() / step) * step;
    const rawDeltaRows = Math.round(deltaY / NOTE_ROW_HEIGHT);

    if (
      !dragState.value.hasMoved &&
      (rawDeltaCols !== 0 || rawDeltaRows !== 0)
    ) {
      dragState.value.hasMoved = true;
    }

    let minDx = -Infinity;
    let maxDx = Infinity;
    let minDy = -Infinity;
    let maxDy = Infinity;

    for (const [, pos] of dragState.value.notesInitialPos) {
      minDx = Math.max(minDx, -pos.x);
      maxDx = Math.min(maxDx, cols() - pos.w - pos.x);
      minDy = Math.max(minDy, -pos.y);
      maxDy = Math.min(maxDy, TOTAL_NOTES - 1 - pos.y);
    }

    const constrainedDx = Math.max(minDx, Math.min(maxDx, rawDeltaCols));
    const constrainedDy = Math.max(minDy, Math.min(maxDy, rawDeltaRows));

    dragPreviewDeltas.value = { dx: constrainedDx, dy: constrainedDy };
  };

  const handleDragEnd = () => {
    if (dragState.value?.hasMoved && dragPreviewDeltas.value) {
      const { dx, dy } = dragPreviewDeltas.value;
      if (dx !== 0 || dy !== 0) {
        const updates: Array<{ noteId: string; updates: Partial<MidiNote> }> =
          [];
        for (const [noteId, pos] of dragState.value.notesInitialPos) {
          updates.push({ noteId, updates: { x: pos.x + dx, y: pos.y + dy } });
        }
        onDragEnd(updates);
      }
      onInteractionEnd();
    }
    dragState.value = null;
    dragPreviewDeltas.value = null;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  return {
    dragState,
    dragPreviewDeltas,
    isDragging,
    isNoteDragging,
    handleDragStart,
    cleanup,
  };
}
