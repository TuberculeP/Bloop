<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import type { Track, AudioClip } from "../../../../lib/utils/types";
import { useTimelineStore } from "../../../../stores/timelineStore";
import { useTrackHistoryStore } from "../../../../stores/trackHistoryStore";
import { useAudioLibraryStore } from "../../../../stores/audioLibraryStore";
import {
  useAudioClipSelection,
  useAudioClipClipboard,
  useAudioClipKeyboard,
  useAudioClipDrag,
  useAudioClipResize,
  useAudioClipCanvas,
} from "../../../../composables/audioClip";
import { useSampleFileDrop } from "../../../../composables/useSampleFileDrop";
import { ticksPerSecond } from "../../../../lib/audio/timeGrid";

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
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isContainerFocused = ref(false);
const mouseGridCol = ref(0);
const justFinishedInteracting = ref(false);

const ROW_HEIGHT = 75;

const clips = computed(() => props.track.clips ?? []);
const gridWidth = computed(() => props.cols * props.colWidth);
const subdivision = computed(() => timelineStore.subdivision);

// Charge le sample de chaque clip de la piste (waveform + durée) : remplace
// l'ancien onMounted par-clip de AudioClipItem.vue, un seul watcher pour
// toute la piste. loadSample() est idempotent (cache par sampleId dans
// audioLibraryStore), donc rappeler pour un sample déjà chargé est un no-op.
watch(
  clips,
  (currentClips) => {
    for (const clip of currentClips) {
      audioLibraryStore.loadSample(clip.sampleId);
    }
  },
  { immediate: true, deep: true },
);

const {
  selectedClipIds,
  selectionRect,
  justFinishedSelecting,
  handleSelectionStart,
  selectClip,
  clearSelection,
  removeFromSelection,
  cleanup: cleanupSelection,
} = useAudioClipSelection(
  containerRef,
  () => clips.value,
  () => props.colWidth,
  () => gridWidth.value,
  () => ROW_HEIGHT,
  () => props.scrollLeft,
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

const onInteractionEnd = (): void => {
  justFinishedInteracting.value = true;
};

// Facteur commun à toute interaction groupée (drag/resize) : un seul batch
// d'historique pour tout le groupe, peu importe le nombre de clips déplacés.
const applyBatchUpdate = <T extends { clipId: string }>(
  label: string,
  updates: T[],
  toChanges: (update: T) => Partial<AudioClip>,
): void => {
  trackHistoryStore.startBatch(props.track.id, label);
  for (const update of updates) {
    timelineStore.updateClipInTrack(
      props.track.id,
      update.clipId,
      toChanges(update),
    );
  }
  trackHistoryStore.endBatch();
};

const handleDragEnd = (updates: Array<{ clipId: string; x: number }>): void => {
  applyBatchUpdate("Move clip", updates, (u) => ({ x: Math.max(0, u.x) }));
};

const {
  dragState,
  dragPreviewDeltaTicks,
  handleDragStart,
  cleanup: cleanupDrag,
} = useAudioClipDrag(
  () => clips.value,
  selectedClipIds,
  () => props.colWidth,
  () => subdivision.value,
  handleDragEnd,
  onInteractionEnd,
);

const handleResizeEnd = (
  updates: Array<{ clipId: string; x: number; w: number; startOffset: number }>,
): void => {
  applyBatchUpdate("Resize clip", updates, (u) => ({
    x: Math.max(0, u.x),
    w: Math.max(1, u.w),
    startOffset: Math.max(0, u.startOffset),
  }));
};

const {
  resizingState,
  resizePreviewDeltaTicks,
  handleResizeStart,
  cleanup: cleanupResize,
} = useAudioClipResize(
  () => clips.value,
  selectedClipIds,
  () => props.colWidth,
  () => subdivision.value,
  handleResizeEnd,
  onInteractionEnd,
);

const { initCanvas, getClipAtPosition, isOnResizeHandle, containerSize } =
  useAudioClipCanvas(canvasRef, {
    cols: () => props.cols,
    colWidth: () => props.colWidth,
    rowHeight: () => ROW_HEIGHT,
    timeSignature: () => timelineStore.timeSignature,
    subdivision: () => subdivision.value,
    clips: () => clips.value,
    trackColor: () => props.track.color,
    tempo: () => timelineStore.tempo,
    selectedClipIds,
    dragState,
    dragPreviewDeltaTicks,
    resizingState,
    resizePreviewDeltaTicks,
    selectionRect,
    scrollLeft: () => props.scrollLeft,
    viewportWidth: () => props.viewportWidth,
    playbackPosition: () => props.playbackPosition,
    isPlaying: () => props.isPlaying,
  });

const toWorldPos = (event: MouseEvent): { x: number; y: number } => {
  const rect = canvasRef.value!.getBoundingClientRect();
  return {
    x: props.scrollLeft + (event.clientX - rect.left),
    y: event.clientY - rect.top,
  };
};

const selectClipAndFocus = (clipId: string, event: MouseEvent): void => {
  selectClip(clipId, event);
  // preventDefault() sur le mousedown coupe la mise au focus native du
  // navigateur : on la redéclenche explicitement pour que les raccourcis
  // clavier scoped (delete/copy/split...) restent actifs.
  containerRef.value?.focus();
};

const handleMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return;
  event.preventDefault();

  const { x: worldX, y: worldY } = toWorldPos(event);
  const clip = getClipAtPosition(worldX, worldY);

  if (clip) {
    selectClipAndFocus(clip.id, event);
    const handle = isOnResizeHandle(worldX, clip);
    if (handle) {
      handleResizeStart(handle, event, clip);
    } else {
      handleDragStart(event, clip);
    }
    return;
  }

  containerRef.value?.focus();
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
    clearSelection();
  }
  handleSelectionStart(event);
};

const handleMouseMove = (event: MouseEvent): void => {
  const { x: worldX, y: worldY } = toWorldPos(event);
  mouseGridCol.value = Math.floor(worldX / props.colWidth);

  if (!canvasRef.value) return;
  if (dragState.value) {
    canvasRef.value.style.cursor = "grabbing";
    return;
  }
  if (resizingState.value) {
    canvasRef.value.style.cursor = "ew-resize";
    return;
  }

  const clip = getClipAtPosition(worldX, worldY);
  if (!clip) {
    canvasRef.value.style.cursor = "";
    return;
  }
  canvasRef.value.style.cursor = isOnResizeHandle(worldX, clip)
    ? "ew-resize"
    : "grab";
};

const handleClick = (event: MouseEvent): void => {
  if (justFinishedInteracting.value || justFinishedSelecting.value) {
    justFinishedInteracting.value = false;
    justFinishedSelecting.value = false;
    return;
  }

  const { x: worldX, y: worldY } = toWorldPos(event);
  if (!getClipAtPosition(worldX, worldY)) {
    clearSelection();
  }
};

const handleContextMenu = (event: MouseEvent): void => {
  const { x: worldX, y: worldY } = toWorldPos(event);
  const clip = getClipAtPosition(worldX, worldY);
  if (!clip) return;

  event.preventDefault();
  trackHistoryStore.recordRemoveClip(props.track.id, clip.id);
  removeFromSelection(clip.id);
};

const handleDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault();
  event.stopPropagation();

  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;

  const x = Math.floor(
    (props.scrollLeft + event.clientX - rect.left) / props.colWidth,
  );

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

const handleFocus = (): void => {
  isContainerFocused.value = true;
};

const handleBlur = (): void => {
  isContainerFocused.value = false;
};

onMounted(() => {
  audioLibraryStore.initialize();
  initCanvas();
});

onBeforeUnmount(() => {
  selectedClipIds.value.clear();
  cleanupSelection();
  cleanupDrag();
  cleanupResize();
});
</script>

<template>
  <div
    ref="containerRef"
    class="audio-clip-container"
    tabindex="0"
    :style="{ width: `${containerSize.width}px` }"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <canvas
      ref="canvasRef"
      class="audio-clip-canvas"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    />

    <div v-if="clips.length === 0" class="drop-hint">
      Drag samples here from the library
    </div>
  </div>
</template>

<style scoped lang="scss">
.audio-clip-container {
  // Bornée à la largeur du viewport visible (pas cols*colWidth) et épinglée
  // juste après la colonne de header, comme TrackHeader.vue et
  // .piano-grid-container (PianoRoll.vue) : rien entre cet élément et
  // .timeline-scroll ne définit d'overflow, donc `sticky` se résout bien
  // contre lui.
  position: sticky;
  left: 180px;
  z-index: 5;
  outline: none;

  &:focus {
    outline: none;
  }
}

.audio-clip-canvas {
  display: block;
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
