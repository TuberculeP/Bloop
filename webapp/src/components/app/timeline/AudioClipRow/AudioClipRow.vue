<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { Track, AudioClip } from "../../../../lib/utils/types";
import { useTimelineStore } from "../../../../stores/timelineStore";
import { useTrackHistoryStore } from "../../../../stores/trackHistoryStore";
import { useAudioLibraryStore } from "../../../../stores/audioLibraryStore";
import {
  useAudioClipSelection,
  useAudioClipClipboard,
  useAudioClipKeyboard,
} from "../../../../composables/audioClip";
import { useSampleFileDrop } from "../../../../composables/useSampleFileDrop";
import { useVisibleGrid } from "../../../../composables/useVisibleGrid";
import { ticksPerSecond } from "../../../../lib/audio/timeGrid";
import AudioClipItem from "./AudioClipItem.vue";

const props = defineProps<{
  track: Track;
  cols: number;
  colWidth: number;
  playbackPosition: number;
  isPlaying: boolean;
  scrollLeft: number;
  viewportWidth: number;
}>();

const timelineStore = useTimelineStore();
const trackHistoryStore = useTrackHistoryStore();
const audioLibraryStore = useAudioLibraryStore();
const { placeFilesOnTrack } = useSampleFileDrop();

const containerRef = ref<HTMLElement | null>(null);
const isContainerFocused = ref(false);
const mouseGridCol = ref(0);

const ROW_HEIGHT = 75;

onMounted(() => {
  audioLibraryStore.initialize();
});

const gridWidth = computed(() => props.cols * props.colWidth);
const clips = computed(() => props.track.clips ?? []);

const {
  barLength,
  visibleTickRange,
  visibleMeasureRange,
  visibleSubdivisionTicks,
} = useVisibleGrid(
  () => props.scrollLeft,
  () => props.viewportWidth,
  () => props.colWidth,
  () => props.cols,
);

const visibleMeasureIndices = computed(() => {
  const [firstBar, lastBar] = visibleMeasureRange.value;
  const result: number[] = [];
  for (let i = firstBar; i <= lastBar; i++) result.push(i);
  return result;
});

const visibleClips = computed(() => {
  const [tickStart, tickEnd] = visibleTickRange.value;
  return clips.value.filter(
    (clip) => clip.x < tickEnd && clip.x + clip.w > tickStart,
  );
});

const {
  selectedClipIds,
  selectionRect,
  isSelecting,
  selectionRectStyle,
  justFinishedSelecting,
  handleSelectionStart,
  selectClip,
  clearSelection,
  removeFromSelection,
} = useAudioClipSelection(
  () => clips.value,
  () => props.colWidth,
  () => gridWidth.value,
  () => ROW_HEIGHT,
);

const handlePasteClips = (clipsToPaste: Array<Omit<AudioClip, "id">>) => {
  trackHistoryStore.startBatch(
    props.track.id,
    `Paste ${clipsToPaste.length} clips`,
  );
  for (const clipData of clipsToPaste) {
    const sample = audioLibraryStore.getSample(clipData.sampleId);
    timelineStore.addClipToTrack(props.track.id, clipData, sample);
  }
  trackHistoryStore.endBatch();
};

const { copySelectedClips, pasteClips, duplicateSelectedClips } =
  useAudioClipClipboard(
    () => clips.value,
    selectedClipIds,
    () => props.cols,
    mouseGridCol,
    handlePasteClips,
  );

const handleDeleteSelected = (): void => {
  if (selectedClipIds.value.size === 0) return;

  trackHistoryStore.startBatch(
    props.track.id,
    `Delete ${selectedClipIds.value.size} clips`,
  );
  for (const clipId of selectedClipIds.value) {
    timelineStore.removeClipFromTrack(props.track.id, clipId);
  }
  trackHistoryStore.endBatch();
  selectedClipIds.value.clear();
};

const handleSplitSelected = (): void => {
  if (selectedClipIds.value.size === 0) return;

  const cutPosition = Math.round(props.playbackPosition);
  const clipIdsToSplit = Array.from(selectedClipIds.value).filter((clipId) => {
    const clip = clips.value.find((c) => c.id === clipId);
    return !!clip && cutPosition > clip.x && cutPosition < clip.x + clip.w;
  });
  if (clipIdsToSplit.length === 0) return;

  trackHistoryStore.startBatch(
    props.track.id,
    `Split ${clipIdsToSplit.length} clip(s)`,
  );
  for (const clipId of clipIdsToSplit) {
    timelineStore.splitClipInTrack(props.track.id, clipId, cutPosition);
  }
  trackHistoryStore.endBatch();
};

useAudioClipKeyboard(
  selectedClipIds,
  {
    onUndo: () => trackHistoryStore.undo(props.track.id),
    onRedo: () => trackHistoryStore.redo(props.track.id),
    onDelete: handleDeleteSelected,
    onEscape: clearSelection,
    onCopy: copySelectedClips,
    onPaste: pasteClips,
    onDuplicate: duplicateSelectedClips,
    onSplit: handleSplitSelected,
  },
  isContainerFocused,
);

const handleClipSelect = (clipId: string, event: MouseEvent): void => {
  selectClip(clipId, event);
  // preventDefault() sur le mousedown de l'item (voir AudioClipItem.vue) coupe
  // la mise au focus native du navigateur : on la redéclenche explicitement
  // pour que les raccourcis clavier scoped (delete/copy/split...) restent actifs.
  containerRef.value?.focus();
};

const handleClipDelete = (clipId: string): void => {
  trackHistoryStore.recordRemoveClip(props.track.id, clipId);
  removeFromSelection(clipId);
};

const handleClipMove = (clipId: string, newX: number): void => {
  const clip = clips.value.find((c) => c.id === clipId);
  if (!clip) return;

  trackHistoryStore.startBatch(props.track.id, "Move clip");
  timelineStore.updateClipInTrack(props.track.id, clipId, {
    x: Math.max(0, newX),
  });
  trackHistoryStore.endBatch();
};

const handleClipResize = (
  clipId: string,
  _side: "left" | "right",
  newX: number,
  newW: number,
  newStartOffset: number,
): void => {
  trackHistoryStore.startBatch(props.track.id, "Resize clip");
  timelineStore.updateClipInTrack(props.track.id, clipId, {
    x: Math.max(0, newX),
    w: Math.max(1, newW),
    startOffset: Math.max(0, newStartOffset),
  });
  trackHistoryStore.endBatch();
};

const handleDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault();
  event.stopPropagation();

  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;

  const x = Math.floor((event.clientX - rect.left) / props.colWidth);

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    await placeFilesOnTrack(files, props.track.id, x);
    return;
  }

  const sampleId = event.dataTransfer?.getData("application/x-sample-id");
  if (!sampleId) return;

  const sample = audioLibraryStore.getSample(sampleId);
  if (!sample) return;

  await audioLibraryStore.loadSample(sampleId);
  const loadedSample = audioLibraryStore.getSample(sampleId);
  if (!loadedSample) return;

  const tickRate = ticksPerSecond(timelineStore.tempo);
  const durationInSteps = Math.ceil(loadedSample.duration * tickRate);

  trackHistoryStore.recordAddClip(
    props.track.id,
    {
      sampleId,
      x: Math.max(0, x),
      w: Math.max(1, durationInSteps),
      startOffset: 0,
    },
    loadedSample,
  );
};

const handleDragOver = (event: DragEvent): void => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
};

const handleContainerMouseDown = (event: MouseEvent): void => {
  if (event.target !== containerRef.value) return;
  if (event.button !== 0) return;
  event.preventDefault();
  containerRef.value?.focus();

  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
    clearSelection();
  }

  if (containerRef.value) {
    handleSelectionStart(event, containerRef.value);
  }
};

const handleContainerClick = (event: MouseEvent): void => {
  if (event.target === containerRef.value && !justFinishedSelecting.value) {
    clearSelection();
  }
  justFinishedSelecting.value = false;
};

const handleMouseMove = (event: MouseEvent): void => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  mouseGridCol.value = Math.floor(x / props.colWidth);
};

const handleFocus = (): void => {
  isContainerFocused.value = true;
};

const handleBlur = (): void => {
  isContainerFocused.value = false;
};

onBeforeUnmount(() => {
  selectedClipIds.value.clear();
});
</script>

<template>
  <div class="audio-clip-row-wrapper">
    <div
      ref="containerRef"
      class="audio-clip-container"
      tabindex="0"
      :style="{ width: `${gridWidth}px`, height: `${ROW_HEIGHT}px` }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @mousedown="handleContainerMouseDown"
      @click="handleContainerClick"
      @mousemove="handleMouseMove"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <div class="grid-lines">
        <div
          v-for="tick in visibleSubdivisionTicks"
          :key="`sub-${tick}`"
          class="subdivision-line"
          :style="{ left: `${tick * colWidth}px` }"
        />
        <div
          v-for="i in visibleMeasureIndices"
          :key="i"
          class="measure-line"
          :style="{ left: `${i * barLength * colWidth}px` }"
        />
      </div>

      <div
        v-if="isPlaying"
        class="playback-cursor"
        :style="{ transform: `translateX(${playbackPosition * colWidth}px)` }"
      />

      <AudioClipItem
        v-for="clip in visibleClips"
        :key="clip.id"
        :clip="clip"
        :col-width="colWidth"
        :row-height="ROW_HEIGHT"
        :color="track.color"
        :is-selected="selectedClipIds.has(clip.id)"
        :tempo="timelineStore.tempo"
        @select="handleClipSelect(clip.id, $event)"
        @delete="handleClipDelete(clip.id)"
        @move="handleClipMove(clip.id, $event)"
        @resize="
          (side, x, w, offset) => handleClipResize(clip.id, side, x, w, offset)
        "
      />

      <div
        v-if="isSelecting && selectionRectStyle"
        class="selection-rect"
        :style="selectionRectStyle"
      />

      <div v-if="clips.length === 0 && !isSelecting" class="drop-hint">
        Drag samples here from the library
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audio-clip-row-wrapper {
  display: flex;
  background: var(--color-bg-primary-dark);
  overflow: visible;
}

.audio-clip-container {
  position: relative;
  background: var(--color-bg-primary-dark);
  outline: none;

  &:focus {
    outline: none;
  }
}

.grid-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.subdivision-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(var(--color-accent3-rgb), 0.12);
}

.measure-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(var(--color-accent3-rgb), 0.3);
}

.playback-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--color-status-error);
  z-index: 100;
  pointer-events: none;
  will-change: transform;
}

.selection-rect {
  position: absolute;
  border: 1px solid var(--color-audio-clip-selected);
  background: rgba(251, 191, 36, 0.1);
  pointer-events: none;
  z-index: 50;
}

.drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  pointer-events: none;
}
</style>
