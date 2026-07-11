<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { NoteName } from "../../../../lib/utils/types";
import {
  NOTE_ROW_HEIGHT,
  WHITE_KEY_MULTIPLIERS,
  isOctaveStart,
  getOctaveNumber,
  getWhiteKeys,
  getBlackKeys,
  ALL_NOTES,
} from "../../../../lib/audio/pianoRollConstants";

defineProps<{
  activeNotes: Set<NoteName>;
  gridHeight: number;
}>();

const emit = defineEmits<{
  (e: "note-start", note: NoteName): void;
  (e: "note-stop", note: NoteName): void;
  (e: "all-notes-stop"): void;
}>();

const notes = ALL_NOTES;
const whiteKeys = computed(() => getWhiteKeys());
const blackKeys = computed(() => getBlackKeys());

const pianoKeysHeight = computed(() => {
  let total = 0;
  for (const note of whiteKeys.value) {
    const noteName = note.replace(/\d+$/, "");
    total += WHITE_KEY_MULTIPLIERS[noteName] * NOTE_ROW_HEIGHT;
  }
  return total;
});

const getWhiteKeyStyle = (note: NoteName) => {
  const whiteKeyIndex = whiteKeys.value.indexOf(note);
  const noteName = note.replace(/\d+$/, "");
  let top = 0;
  for (let i = 0; i < whiteKeyIndex; i++) {
    const prevNote = whiteKeys.value[i];
    const prevName = prevNote.replace(/\d+$/, "");
    top += WHITE_KEY_MULTIPLIERS[prevName] * NOTE_ROW_HEIGHT;
  }
  return {
    position: "absolute" as const,
    top: `${top}px`,
    height: `${WHITE_KEY_MULTIPLIERS[noteName] * NOTE_ROW_HEIGHT}px`,
    width: "100%",
    left: "0",
    zIndex: 1,
  };
};

const getBlackKeyStyle = (note: NoteName) => {
  const noteIndex = notes.indexOf(note);
  return {
    position: "absolute" as const,
    top: `${noteIndex * NOTE_ROW_HEIGHT}px`,
    height: `${NOTE_ROW_HEIGHT}px`,
    width: "55%",
    left: "0",
    zIndex: 2,
  };
};

const isMouseDown = ref(false);

const onKeyMouseDown = (note: NoteName): void => {
  isMouseDown.value = true;
  emit("note-start", note);
};

const onKeyMouseUp = (): void => {
  isMouseDown.value = false;
  emit("all-notes-stop");
};

const onKeyMouseEnter = (note: NoteName): void => {
  if (isMouseDown.value) emit("note-start", note);
};

const onKeyMouseLeave = (note: NoteName): void => {
  emit("note-stop", note);
};

const handleGlobalMouseUp = (): void => {
  if (isMouseDown.value) {
    isMouseDown.value = false;
    emit("all-notes-stop");
  }
};

onMounted(() => {
  document.addEventListener("mouseup", handleGlobalMouseUp);
});

onBeforeUnmount(() => {
  document.removeEventListener("mouseup", handleGlobalMouseUp);
});
</script>

<template>
  <div class="piano-keys">
    <div
      class="piano-keys-inner"
      :style="{
        height: `${pianoKeysHeight}px`,
        minHeight: `${gridHeight}px`,
      }"
    >
      <div
        v-for="note in whiteKeys"
        :key="`white-${note}`"
        class="piano-key white-key"
        :class="{
          'octave-start': isOctaveStart(note),
          'preview-active': activeNotes.has(note),
        }"
        :style="getWhiteKeyStyle(note)"
        @mousedown.prevent="onKeyMouseDown(note)"
        @mouseup="onKeyMouseUp()"
        @mouseenter="onKeyMouseEnter(note)"
        @mouseleave="onKeyMouseLeave(note)"
      >
        <span class="note-name">{{ note }}</span>
        <span v-if="isOctaveStart(note)" class="octave-number">
          {{ getOctaveNumber(note) }}
        </span>
      </div>
      <div
        v-for="note in blackKeys"
        :key="`black-${note}`"
        class="piano-key black-key"
        :class="{ 'preview-active': activeNotes.has(note) }"
        :style="getBlackKeyStyle(note)"
        @mousedown.prevent="onKeyMouseDown(note)"
        @mouseup="onKeyMouseUp()"
        @mouseenter="onKeyMouseEnter(note)"
        @mouseleave="onKeyMouseLeave(note)"
      >
        <span class="note-name">{{ note }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.piano-keys {
  width: 180px;
  min-width: 180px;
  flex-shrink: 0;
  background: var(--color-piano-key-black);
  border-right: 2px solid #333;
  box-sizing: border-box;
  position: sticky;
  left: 0;
  z-index: 5;
}

.piano-keys-inner {
  position: relative;
  width: 100%;
}

.piano-key {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 4px;
  font-size: 9px;
  font-weight: bold;
  cursor: pointer;
  box-sizing: border-box;
}

.piano-key.white-key {
  background: linear-gradient(to left, #e8e8e8 0%, #f5f5f5 50%, #e0e0e0 100%);
  color: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid #bbb;
  border-radius: 0 0 3px 3px;
  box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    background: linear-gradient(to left, #f0f0f0 0%, #fff 50%, #e8e8e8 100%);
  }

  &.octave-start {
    border-bottom: 2px solid #222;
  }

  &.preview-active {
    background: var(--color-error);
    color: white;
  }
}

.piano-key.black-key {
  background: linear-gradient(
    to bottom,
    var(--color-piano-key-black) 0%,
    #1a1a1a 60%,
    #0a0a0a 100%
  );
  color: rgba(255, 255, 255, 0.25);
  border-radius: 0 0 2px 2px;
  box-shadow:
    inset 0 -3px 5px rgba(0, 0, 0, 0.4),
    2px 2px 4px rgba(0, 0, 0, 0.5);
  justify-content: center;
  padding-right: 0;

  &:hover {
    background: linear-gradient(
      to bottom,
      #3a3a3a 0%,
      var(--color-piano-key-black) 60%,
      #1a1a1a 100%
    );
  }

  &.preview-active {
    background: var(--color-accent3-hover);
    color: white;
  }
}

.note-name {
  font-size: 10px;
}

.black-key .note-name {
  font-size: 8px;
  text-align: center;
}

.octave-number {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.3);
  font-weight: bold;
  margin-left: 3px;
}
</style>
