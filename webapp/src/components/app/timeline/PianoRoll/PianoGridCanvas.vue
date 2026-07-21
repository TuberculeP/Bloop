<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { MidiNote, NoteName } from "../../../../lib/utils/types";
import {
  TOTAL_NOTES,
  NOTE_ROW_HEIGHT,
} from "../../../../lib/audio/pianoRollConstants";
import { usePianoGridCanvas } from "../../../../composables/pianoGrid/usePianoGridCanvas";
import {
  usePianoGridSelection,
  usePianoGridResize,
  usePianoGridDrag,
  usePianoGridClipboard,
  usePianoGridKeyboard,
} from "../../../../composables/pianoGrid";
import { useTimelineStore } from "../../../../stores/timelineStore";
import { snapTicks, ticksPerBar } from "../../../../lib/audio/timeGrid";

const props = defineProps<{
  notes: MidiNote[];
  cols: number;
  colWidth: number;
  color: string;
  activeNotes: Set<NoteName>;
  trackId: string;
  scrollLeft: number;
  scrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
}>();

const emit = defineEmits<{
  (e: "add-note", x: number, y: number, useGridSize: boolean): void;
  (e: "remove-note", noteId: string): void;
  (
    e: "update-notes",
    updates: Array<{ noteId: string; updates: Partial<MidiNote> }>,
  ): void;
  (e: "delete-notes", noteIds: string[]): void;
  (e: "paste-notes", notes: Array<{ x: number; y: number; w: number }>): void;
  (e: "undo"): void;
  (e: "redo"): void;
}>();

const timelineStore = useTimelineStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const mouseGridPos = ref<{ col: number; row: number }>({ col: 0, row: 0 });
const justFinishedInteracting = ref(false);
const hoverTarget = ref<"note" | "resize" | null>(null);

const gridWidth = computed(() => props.cols * props.colWidth);
const gridHeight = computed(() => TOTAL_NOTES * NOTE_ROW_HEIGHT);
const subdivision = computed(() => timelineStore.subdivision);
const snapStep = computed(() => snapTicks(subdivision.value));

// Selection composable : le canvas ne couvre plus que le viewport visible,
// on lui passe donc le scroll courant pour convertir les coordonnées
// souris (canvas-local) en coordonnées monde.
const {
  selectedNotes,
  selectionRect,
  isSelecting,
  justFinishedSelecting,
  handleSelectionStart,
  toggleNoteSelection,
  clearSelection,
  removeFromSelection,
  cleanup: cleanupSelection,
} = usePianoGridSelection(
  canvasRef,
  () => props.notes,
  () => props.colWidth,
  () => gridWidth.value,
  () => gridHeight.value,
  () => props.scrollLeft,
  () => props.scrollTop,
);

// Resize composable
const {
  resizingState,
  resizePreviewDelta,
  isResizing,
  handleResizeStart,
  cleanup: cleanupResize,
} = usePianoGridResize(
  () => props.notes,
  selectedNotes,
  () => props.colWidth,
  () => props.cols,
  (updates) => emit("update-notes", updates),
  () => {
    justFinishedInteracting.value = true;
  },
  () => snapStep.value,
  (width) => timelineStore.setLastResizedNoteWidth(width),
);

// Drag composable
const {
  dragState,
  dragPreviewDeltas,
  isDragging,
  handleDragStart,
  cleanup: cleanupDrag,
} = usePianoGridDrag(
  () => props.notes,
  selectedNotes,
  () => props.colWidth,
  () => props.cols,
  (updates) => emit("update-notes", updates),
  () => {
    justFinishedInteracting.value = true;
  },
  () => snapStep.value,
);

// Clipboard composable
const { copySelectedNotes, pasteNotes, duplicateSelectedNotes } =
  usePianoGridClipboard(
    () => props.notes,
    selectedNotes,
    () => props.cols,
    mouseGridPos,
    (notes) => emit("paste-notes", notes),
    () => snapStep.value,
  );

// Delete selected notes
const deleteSelectedNotes = () => {
  const noteIds = Array.from(selectedNotes.value);
  emit("delete-notes", noteIds);
  selectedNotes.value.clear();
};

// Move selected notes via arrow keys : clamp rigide du groupe (comme
// usePianoGridDrag) plutôt qu'un skip par-note, pour ne pas casser
// l'espacement relatif d'un accord sélectionné en butant sur un bord — ce
// même clamp fait aussi que la sélection vient se coller au début/à la fin
// de la piste dès qu'un saut (mesure ou pas) la dépasserait, plutôt que de
// ne rien faire ou de sortir des bornes.
const moveSelectedNotes = (
  dxDirection: number,
  dy: number,
  horizontalUnit: "step" | "bar" = "step",
) => {
  const selected = props.notes.filter((n) => selectedNotes.value.has(n.i));
  if (selected.length === 0) return;

  const horizontalStep =
    horizontalUnit === "bar"
      ? ticksPerBar(timelineStore.timeSignature)
      : snapStep.value;
  const requestedDx = dxDirection * horizontalStep;

  let minDx = -Infinity;
  let maxDx = Infinity;
  let minDy = -Infinity;
  let maxDy = Infinity;
  for (const note of selected) {
    minDx = Math.max(minDx, -note.x);
    maxDx = Math.min(maxDx, props.cols - note.w - note.x);
    minDy = Math.max(minDy, -note.y);
    maxDy = Math.min(maxDy, TOTAL_NOTES - 1 - note.y);
  }

  const clampedDx = Math.max(minDx, Math.min(maxDx, requestedDx));
  const clampedDy = Math.max(minDy, Math.min(maxDy, dy));
  if (clampedDx === 0 && clampedDy === 0) return;

  const updates = selected.map((note) => ({
    noteId: note.i,
    updates: { x: note.x + clampedDx, y: note.y + clampedDy },
  }));
  emit("update-notes", updates);
};

// Keyboard composable
usePianoGridKeyboard(selectedNotes, {
  onUndo: () => emit("undo"),
  onRedo: () => emit("redo"),
  onDelete: deleteSelectedNotes,
  onEscape: clearSelection,
  onCopy: copySelectedNotes,
  onPaste: pasteNotes,
  onDuplicate: duplicateSelectedNotes,
  onMoveSelection: moveSelectedNotes,
});

// Canvas composable
const { initCanvas, getNoteAtPosition, isOnResizeHandle, containerSize } =
  usePianoGridCanvas(canvasRef, {
    cols: () => props.cols,
    colWidth: () => props.colWidth,
    notes: () => props.notes,
    trackColor: () => props.color,
    timeSignature: () => timelineStore.timeSignature,
    subdivision: () => subdivision.value,
    activeNotes: () => props.activeNotes,
    selectedNotes,
    dragState,
    dragPreviewDeltas,
    resizingState,
    resizePreviewDelta,
    selectionRect,
    scrollLeft: () => props.scrollLeft,
    scrollTop: () => props.scrollTop,
    viewportWidth: () => props.viewportWidth,
    viewportHeight: () => props.viewportHeight,
  });

// Event handlers adapted for Canvas
//
// Le canvas ne couvre plus que le viewport visible (voir usePianoGridCanvas.ts) :
// les coordonnées canvas-local (via getBoundingClientRect) doivent être
// recalées en coordonnées monde en ajoutant le scroll courant avant toute
// conversion col/row ou hit-test — c'est la seule frontière où cette
// correction est appliquée, tout le reste (renderer, hit-testing) continue
// de travailler en coordonnées monde pures.
const toWorldPos = (event: MouseEvent): { x: number; y: number } => {
  const rect = canvasRef.value!.getBoundingClientRect();
  return {
    x: props.scrollLeft + (event.clientX - rect.left),
    y: props.scrollTop + (event.clientY - rect.top),
  };
};

const handleMouseMove = (event: MouseEvent) => {
  const { x: worldX, y: worldY } = toWorldPos(event);
  mouseGridPos.value = {
    col: Math.floor(worldX / props.colWidth),
    row: Math.floor(worldY / NOTE_ROW_HEIGHT),
  };

  if (isDragging.value || isResizing.value || isSelecting.value) return;

  const note = getNoteAtPosition(worldX, worldY);
  if (!note) {
    hoverTarget.value = null;
  } else if (isOnResizeHandle(worldX, note)) {
    hoverTarget.value = "resize";
  } else {
    hoverTarget.value = "note";
  }
};

const handleMouseLeave = () => {
  hoverTarget.value = null;
};

const cursorStyle = computed(() => {
  if (isDragging.value) return "grabbing";
  if (isResizing.value) return "ew-resize";
  if (isSelecting.value) return "crosshair";
  if (hoverTarget.value === "resize") return "ew-resize";
  if (hoverTarget.value === "note") return "grab";
  return "default";
});

const handleMouseDown = (event: MouseEvent) => {
  const { x: worldX, y: worldY } = toWorldPos(event);

  const note = getNoteAtPosition(worldX, worldY);

  if (note) {
    if (isOnResizeHandle(worldX, note)) {
      handleResizeStart(event, note);
    } else if (event.ctrlKey || event.metaKey) {
      toggleNoteSelection(note.i);
    } else {
      handleDragStart(event, note);
    }
  } else if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    handleSelectionStart(event);
  }
};

const handleClick = (event: MouseEvent) => {
  if (justFinishedInteracting.value || justFinishedSelecting.value) {
    justFinishedInteracting.value = false;
    justFinishedSelecting.value = false;
    return;
  }

  const { x: worldX, y: worldY } = toWorldPos(event);

  const note = getNoteAtPosition(worldX, worldY);

  if (!note) {
    // Floor (pas round) : on veut la cellule de grille qui contient le clic,
    // pas la ligne de grille la plus proche — sinon un clic dans la moitié
    // droite d'une cellule crée la note sur la cellule suivante.
    const col =
      Math.floor(worldX / props.colWidth / snapStep.value) * snapStep.value;
    const row = Math.floor(worldY / NOTE_ROW_HEIGHT);

    if (col >= 0 && col < props.cols && row >= 0 && row < TOTAL_NOTES) {
      clearSelection();
      emit("add-note", col, row, event.shiftKey);
    }
  }
};

const handleRightClick = (event: MouseEvent) => {
  event.preventDefault();

  const { x: worldX, y: worldY } = toWorldPos(event);

  const note = getNoteAtPosition(worldX, worldY);

  if (note) {
    emit("remove-note", note.i);
    removeFromSelection(note.i);
  } else {
    clearSelection();
  }
};

onMounted(() => {
  initCanvas();
});

onBeforeUnmount(() => {
  cleanupSelection();
  cleanupResize();
  cleanupDrag();
});
</script>

<template>
  <div
    ref="containerRef"
    class="piano-grid-canvas"
    :style="{
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      cursor: cursorStyle,
    }"
  >
    <canvas
      ref="canvasRef"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
      @contextmenu="handleRightClick"
    />
  </div>
</template>

<style scoped lang="scss">
.piano-grid-canvas {
  position: relative;

  canvas {
    display: block;
    // Le wrapper (.piano-grid-canvas) est le "spacer" qui donne au conteneur
    // parent (.piano-grid-container, overflow-y: auto) sa vraie plage de
    // scroll vertical ; le canvas lui-même ne fait que la taille du viewport
    // visible et reste épinglé en haut de cette plage pendant le scroll.
    position: sticky;
    top: 0;
  }
}
</style>
