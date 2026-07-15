import { ref, computed, type Ref } from "vue";
import type { MidiNote } from "../../lib/utils/types";
import { NOTE_ROW_HEIGHT } from "../../lib/audio/pianoRollConstants";

export interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function usePianoGridSelection(
  containerRef: Ref<HTMLElement | null> | null,
  notes: () => MidiNote[],
  colWidth: () => number,
  gridWidth: () => number,
  gridHeight: () => number,
  scrollLeft: () => number = () => 0,
  scrollTop: () => number = () => 0,
) {
  const selectedNotes = ref<Set<string>>(new Set());
  const selectionRect = ref<SelectionRect | null>(null);
  const justFinishedSelecting = ref(false);

  const isSelecting = computed(() => selectionRect.value !== null);

  const selectionRectStyle = computed(() => {
    if (!selectionRect.value) return null;
    const { startX, startY, currentX, currentY } = selectionRect.value;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  });

  // Le canvas ne couvre plus que le viewport visible : les coordonnées
  // canvas-local (via getBoundingClientRect) sont recalées en coordonnées
  // monde en ajoutant le scroll courant, comme dans PianoGridCanvas.vue.
  // Le rectangle de sélection est ainsi stocké en coordonnées monde, ce qui
  // permet à pianoGridRenderer.ts de le dessiner correctement via la même
  // translation globale (-scrollLeft, -scrollTop) que le reste de la grille.
  const handleSelectionStart = (event: MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = scrollLeft() + (event.clientX - rect.left);
    const y = scrollTop() + (event.clientY - rect.top);
    selectionRect.value = { startX: x, startY: y, currentX: x, currentY: y };
    document.addEventListener("mousemove", handleSelectionMove);
    document.addEventListener("mouseup", handleSelectionEnd);
  };

  const handleSelectionMove = (event: MouseEvent) => {
    if (!selectionRect.value) return;
    const grid = containerRef?.value ?? document.querySelector(".piano-grid");
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const worldX = scrollLeft() + (event.clientX - rect.left);
    const worldY = scrollTop() + (event.clientY - rect.top);
    const x = Math.max(0, Math.min(worldX, gridWidth()));
    const y = Math.max(0, Math.min(worldY, gridHeight()));
    selectionRect.value.currentX = x;
    selectionRect.value.currentY = y;
  };

  const handleSelectionEnd = () => {
    if (selectionRect.value) {
      const { startX, startY, currentX, currentY } = selectionRect.value;
      const left = Math.min(startX, currentX);
      const right = Math.max(startX, currentX);
      const top = Math.min(startY, currentY);
      const bottom = Math.max(startY, currentY);

      const colLeft = left / colWidth();
      const colRight = right / colWidth();
      const rowTop = top / NOTE_ROW_HEIGHT;
      const rowBottom = bottom / NOTE_ROW_HEIGHT;

      for (const note of notes()) {
        const noteLeft = note.x;
        const noteRight = note.x + note.w;
        const noteTop = note.y;
        const noteBottom = note.y + 1;

        const overlaps =
          noteLeft < colRight &&
          noteRight > colLeft &&
          noteTop < rowBottom &&
          noteBottom > rowTop;

        if (overlaps) {
          selectedNotes.value.add(note.i);
        }
      }
      justFinishedSelecting.value = true;
    }
    selectionRect.value = null;
    document.removeEventListener("mousemove", handleSelectionMove);
    document.removeEventListener("mouseup", handleSelectionEnd);
  };

  const toggleNoteSelection = (noteId: string) => {
    if (selectedNotes.value.has(noteId)) {
      selectedNotes.value.delete(noteId);
    } else {
      selectedNotes.value.add(noteId);
    }
  };

  const clearSelection = () => {
    selectedNotes.value.clear();
  };

  const removeFromSelection = (noteId: string) => {
    selectedNotes.value.delete(noteId);
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", handleSelectionMove);
    document.removeEventListener("mouseup", handleSelectionEnd);
  };

  return {
    selectedNotes,
    selectionRect,
    isSelecting,
    selectionRectStyle,
    justFinishedSelecting,
    handleSelectionStart,
    toggleNoteSelection,
    clearSelection,
    removeFromSelection,
    cleanup,
  };
}
