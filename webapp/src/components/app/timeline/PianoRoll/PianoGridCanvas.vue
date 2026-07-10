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

const props = defineProps<{
  notes: MidiNote[];
  cols: number;
  colWidth: number;
  color: string;
  activeNotes: Set<NoteName>;
  trackId: string;
}>();

const emit = defineEmits<{
  (e: "add-note", x: number, y: number): void;
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

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const mouseGridPos = ref<{ col: number; row: number }>({ col: 0, row: 0 });
const justFinishedInteracting = ref(false);

const gridWidth = computed(() => props.cols * props.colWidth);
const gridHeight = computed(() => TOTAL_NOTES * NOTE_ROW_HEIGHT);

// Selection composable with containerRef
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
  containerRef,
  () => props.notes,
  () => props.colWidth,
  () => gridWidth.value,
  () => gridHeight.value,
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
);

// Clipboard composable
const { copySelectedNotes, pasteNotes, duplicateSelectedNotes } =
  usePianoGridClipboard(
    () => props.notes,
    selectedNotes,
    () => props.cols,
    mouseGridPos,
    (notes) => emit("paste-notes", notes),
  );

// Delete selected notes
const deleteSelectedNotes = () => {
  const noteIds = Array.from(selectedNotes.value);
  emit("delete-notes", noteIds);
  selectedNotes.value.clear();
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
});

// Canvas composable
const { initCanvas, getNoteAtPosition, isOnResizeHandle } = usePianoGridCanvas(
  canvasRef,
  {
    cols: () => props.cols,
    colWidth: () => props.colWidth,
    notes: () => props.notes,
    trackColor: () => props.color,
    activeNotes: () => props.activeNotes,
    selectedNotes,
    dragState,
    dragPreviewDeltas,
    resizingState,
    resizePreviewDelta,
    selectionRect,
  },
);

// Event handlers adapted for Canvas
const handleMouseMove = (event: MouseEvent) => {
  const rect = canvasRef.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  mouseGridPos.value = {
    col: Math.floor(x / props.colWidth),
    row: Math.floor(y / NOTE_ROW_HEIGHT),
  };
};

const handleMouseDown = (event: MouseEvent) => {
  const rect = canvasRef.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const note = getNoteAtPosition(x, y);

  if (note) {
    if (isOnResizeHandle(x, note)) {
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

  const rect = canvasRef.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const note = getNoteAtPosition(x, y);

  if (!note) {
    const col = Math.floor(x / props.colWidth);
    const row = Math.floor(y / NOTE_ROW_HEIGHT);

    if (col >= 0 && col < props.cols && row >= 0 && row < TOTAL_NOTES) {
      clearSelection();
      emit("add-note", col, row);
    }
  }
};

const handleRightClick = (event: MouseEvent) => {
  event.preventDefault();

  const rect = canvasRef.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const note = getNoteAtPosition(x, y);

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
    :class="{
      resizing: isResizing,
      dragging: isDragging,
      selecting: isSelecting,
    }"
    :style="{ width: `${gridWidth}px`, height: `${gridHeight}px` }"
  >
    <canvas
      ref="canvasRef"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @click="handleClick"
      @contextmenu="handleRightClick"
    />
  </div>
</template>

<style scoped lang="scss">
.piano-grid-canvas {
  position: relative;
  cursor: crosshair;

  &.resizing {
    cursor: ew-resize;
  }

  &.dragging {
    cursor: grabbing;
  }

  &.selecting {
    cursor: crosshair;
  }

  canvas {
    display: block;
  }
}
</style>
