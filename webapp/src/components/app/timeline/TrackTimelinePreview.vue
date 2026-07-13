<script setup lang="ts">
import { computed } from "vue";
import type { MidiNote } from "../../../lib/utils/types";
import { TOTAL_NOTES } from "../../../lib/audio/pianoRollConstants";

const props = defineProps<{
  notes: MidiNote[];
  cols: number;
  colWidth: number;
  rowHeight: number;
  color: string;
}>();

const emit = defineEmits<{
  (e: "dblclick"): void;
}>();

const gridStyle = computed(() => ({
  width: `${props.cols * props.colWidth}px`,
  height: `${props.rowHeight}px`,
}));

const getNotePreviewTop = (noteY: number): number => {
  const ratio = noteY / TOTAL_NOTES;
  return ratio * props.rowHeight;
};

const getNotePreviewHeight = (): number => {
  return Math.max(2, (props.rowHeight / TOTAL_NOTES) * 4);
};
</script>

<template>
  <div class="track-timeline" :style="gridStyle" @dblclick="emit('dblclick')">
    <div class="grid-lines">
      <div
        v-for="i in Math.ceil(cols / 4)"
        :key="i"
        class="measure-line"
        :style="{ left: `${(i - 1) * 4 * colWidth}px` }"
      />
    </div>
    <div class="notes-preview">
      <div
        v-for="note in notes"
        :key="note.i"
        class="note-preview"
        :style="{
          left: `${note.x * colWidth}px`,
          top: `${getNotePreviewTop(note.y)}px`,
          width: `${Math.max(note.w * colWidth - 1, 2)}px`,
          height: `${getNotePreviewHeight()}px`,
          backgroundColor: color,
        }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.track-timeline {
  position: relative;
  background: var(--color-bg-primary-dark);
  overflow: hidden;
  cursor: pointer;

  &:hover {
    /* stylelint-disable-next-line color-no-hex -- même teinte que le hover du rendu canvas équivalent (TrackTimelinePreviewCanvas) */
    background: #1f1119;
  }
}

.grid-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.measure-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-border-secondary);
}

.notes-preview {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.note-preview {
  position: absolute;
  border-radius: 1px;
  opacity: 0.8;
  pointer-events: none;
}
</style>
