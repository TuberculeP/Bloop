<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import type { MidiNote, NoteName } from "../../../../lib/utils/types";
import {
  TOTAL_NOTES,
  NOTE_ROW_HEIGHT,
  ALL_NOTES,
  isBlackKey,
  isOctaveStart,
  noteIndexToName,
} from "../../../../lib/audio/pianoRollConstants";
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

const allNotes = ALL_NOTES;
const mouseGridPos = ref<{ col: number; row: number }>({ col: 0, row: 0 });
const justFinishedInteracting = ref(false);

const gridWidth = computed(() => props.cols * props.colWidth);
const gridHeight = computed(() => TOTAL_NOTES * NOTE_ROW_HEIGHT);

// Selection composable
const {
  selectedNotes,
  selectionRect,
  isSelecting,
  selectionRectStyle,
  justFinishedSelecting,
  handleSelectionStart,
  toggleNoteSelection,
  clearSelection,
  removeFromSelection,
  cleanup: cleanupSelection,
} = usePianoGridSelection(
  null,
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
  isNoteResizing,
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
  isNoteDragging,
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

// Move selected notes by delta
const moveSelectedNotes = (dx: number, dy: number) => {
  if (selectedNotes.value.size === 0) return;

  const selectedNotesList = props.notes.filter((n) =>
    selectedNotes.value.has(n.i),
  );

  // Check bounds before moving
  const canMove = selectedNotesList.every((note) => {
    const newX = note.x + dx;
    const newY = note.y + dy;
    return (
      newX >= 0 &&
      newX + note.w <= props.cols &&
      newY >= 0 &&
      newY < TOTAL_NOTES
    );
  });

  if (!canMove) return;

  const updates = selectedNotesList.map((note) => ({
    noteId: note.i,
    updates: {
      x: note.x + dx,
      y: note.y + dy,
    },
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

// Note style with drag/resize preview
const getNoteStyle = (note: MidiNote) => {
  if (dragState.value && dragPreviewDeltas.value && isNoteDragging(note.i)) {
    const initial = dragState.value.notesInitialPos.get(note.i)!;
    return {
      left: `${(initial.x + dragPreviewDeltas.value.dx) * props.colWidth}px`,
      top: `${(initial.y + dragPreviewDeltas.value.dy) * NOTE_ROW_HEIGHT}px`,
      width: `${note.w * props.colWidth - 2}px`,
      height: `${NOTE_ROW_HEIGHT - 2}px`,
      backgroundColor: props.color,
    };
  }
  if (
    resizingState.value &&
    resizePreviewDelta.value !== null &&
    isNoteResizing(note.i)
  ) {
    const initial = resizingState.value.notesInitialWidth.get(note.i)!;
    const newWidth = initial.width + resizePreviewDelta.value;
    return {
      left: `${note.x * props.colWidth}px`,
      top: `${note.y * NOTE_ROW_HEIGHT}px`,
      width: `${newWidth * props.colWidth - 2}px`,
      height: `${NOTE_ROW_HEIGHT - 2}px`,
      backgroundColor: props.color,
    };
  }
  return {
    left: `${note.x * props.colWidth}px`,
    top: `${note.y * NOTE_ROW_HEIGHT}px`,
    width: `${note.w * props.colWidth - 2}px`,
    height: `${NOTE_ROW_HEIGHT - 2}px`,
    backgroundColor: props.color,
  };
};

// Grid event handlers
const handleGridMouseMove = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  mouseGridPos.value = {
    col: Math.floor(x / props.colWidth),
    row: Math.floor(y / NOTE_ROW_HEIGHT),
  };
};

const handleGridMouseDown = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const isOnNote =
    target.classList.contains("note-block") ||
    target.classList.contains("resize-handle") ||
    target.classList.contains("note-label");

  if ((event.ctrlKey || event.metaKey) && !isOnNote) {
    event.preventDefault();
    handleSelectionStart(event);
  }
};

const handleGridClick = (event: MouseEvent) => {
  if (justFinishedInteracting.value || justFinishedSelecting.value) {
    justFinishedInteracting.value = false;
    justFinishedSelecting.value = false;
    return;
  }
  const target = event.target as HTMLElement;
  if (
    !target.classList.contains("note-block") &&
    !target.classList.contains("resize-handle") &&
    !target.classList.contains("note-label")
  ) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / props.colWidth);
    const row = Math.floor(y / NOTE_ROW_HEIGHT);

    if (col >= 0 && col < props.cols && row >= 0 && row < TOTAL_NOTES) {
      clearSelection();
      emit("add-note", col, row);
    }
  }
};

const handleGridRightClick = (event: MouseEvent) => {
  event.preventDefault();
  const target = event.target as HTMLElement;
  if (
    !target.classList.contains("note-block") &&
    !target.classList.contains("resize-handle") &&
    !target.classList.contains("note-label")
  ) {
    clearSelection();
  }
};

const handleNoteClick = (event: MouseEvent, note: MidiNote) => {
  event.stopPropagation();
  if (event.ctrlKey || event.metaKey) {
    toggleNoteSelection(note.i);
  }
};

const handleNoteRightClick = (event: MouseEvent, note: MidiNote) => {
  event.preventDefault();
  event.stopPropagation();
  emit("remove-note", note.i);
  removeFromSelection(note.i);
};

onBeforeUnmount(() => {
  cleanupSelection();
  cleanupResize();
  cleanupDrag();
});
</script>

<template>
  <div
    class="piano-grid"
    :class="{
      resizing: isResizing,
      dragging: isDragging,
      selecting: isSelecting,
    }"
    :style="{ width: `${gridWidth}px`, height: `${gridHeight}px` }"
    @mousemove="handleGridMouseMove"
    @mousedown="handleGridMouseDown"
    @click="handleGridClick"
    @contextmenu="handleGridRightClick"
  >
    <div class="measure-lines">
      <div
        v-for="i in Math.ceil(cols / 4)"
        :key="`measure-${i}`"
        class="measure-line"
        :style="{ left: `${(i - 1) * 4 * colWidth}px` }"
      />
    </div>
    <div class="grid-background">
      <div
        v-for="(noteName, rowIndex) in allNotes"
        :key="`row-${rowIndex}`"
        class="grid-row"
        :class="{
          'black-key-row': isBlackKey(noteName),
          'octave-start-row': isOctaveStart(noteName),
          'preview-highlight': activeNotes.has(noteName),
        }"
        :style="{ height: `${NOTE_ROW_HEIGHT}px` }"
      >
        <div
          v-for="col in cols"
          :key="`cell-${rowIndex}-${col}`"
          class="grid-cell"
          :style="{ width: `${colWidth}px` }"
        />
      </div>
    </div>

    <!-- Notes -->
    <div
      v-for="note in notes"
      :key="note.i"
      class="note-block"
      :class="{
        selected: selectedNotes.has(note.i),
        'black-note': isBlackKey(noteIndexToName(note.y)),
        'is-resizing': isNoteResizing(note.i),
        'is-dragging': isNoteDragging(note.i),
      }"
      :style="getNoteStyle(note)"
      @mousedown="handleDragStart($event, note)"
      @click="handleNoteClick($event, note)"
      @contextmenu="handleNoteRightClick($event, note)"
    >
      <span class="note-label">{{ noteIndexToName(note.y) }}</span>
      <div class="resize-handle" @mousedown="handleResizeStart($event, note)" />
    </div>

    <!-- Marquee selection rectangle -->
    <div
      v-if="selectionRect"
      class="selection-rect"
      :style="selectionRectStyle"
    />
  </div>
</template>

<style scoped lang="scss">
.piano-grid {
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
}

.grid-background {
  position: absolute;
  inset: 0;
}

.grid-row {
  display: flex;

  &.black-key-row {
    background: rgba(0, 0, 0, 0.15);
  }

  &.octave-start-row {
    border-bottom: 2px solid rgba(0, 0, 0, 0.3);
  }

  &.preview-highlight {
    background: rgba(var(--color-error-rgb), 0.15);
  }
}

.grid-cell {
  border-right: 1px solid rgba(var(--color-accent3-rgb), 0.2);
  border-bottom: 1px solid rgba(var(--color-accent3-rgb), 0.15);
  box-sizing: border-box;
}

.measure-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.measure-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-border-secondary);
}

.note-block {
  position: absolute;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding-left: 3px;
  font-size: 8px;
  color: rgba(0, 0, 0, 0.8);
  user-select: none;
  opacity: 0.9;
  z-index: 2;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    opacity: 1;

    .resize-handle {
      opacity: 1;
    }
  }

  &.selected {
    outline: 2px solid var(--color-accent);
    box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.4);
    z-index: 10;

    .resize-handle {
      opacity: 1;
    }
  }

  &.black-note {
    filter: brightness(0.85);
  }

  &.is-resizing,
  &.is-dragging {
    opacity: 0.7;
    outline: 2px dashed var(--color-accent);
    cursor: grabbing;
  }
}

.note-label {
  overflow: hidden;
  white-space: nowrap;
  font-weight: 500;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(0, 0, 0, 0.3) 100%
  );
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transition: opacity 0.15s ease;

  &:hover {
    background: linear-gradient(
      to right,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 100%
    );
  }
}

.selection-rect {
  position: absolute;
  border: 2px dashed var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.1);
  pointer-events: none;
  z-index: 20;
}
</style>
