<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { AudioClip } from "../../../../lib/utils/types";
import { useAudioLibraryStore } from "../../../../stores/audioLibraryStore";
import WaveformCanvas from "./WaveformCanvas.vue";

const props = defineProps<{
  clip: AudioClip;
  colWidth: number;
  rowHeight: number;
  color: string;
  isSelected: boolean;
  tempo: number;
}>();

const emit = defineEmits<{
  (e: "select", event: MouseEvent): void;
  (e: "delete"): void;
  (e: "move", newX: number): void;
  (
    e: "resize",
    side: "left" | "right",
    newX: number,
    newW: number,
    newStartOffset: number,
  ): void;
}>();

const audioLibraryStore = useAudioLibraryStore();

const isDragging = ref(false);
const isResizing = ref(false);
const resizeSide = ref<"left" | "right">("right");
const dragStartX = ref(0);
const initialClipState = ref({ x: 0, w: 0, startOffset: 0 });

onMounted(() => {
  audioLibraryStore.loadSample(props.clip.sampleId);
});

const sample = computed(() => audioLibraryStore.getSample(props.clip.sampleId));

const clipStyle = computed(() => ({
  left: `${props.clip.x * props.colWidth}px`,
  width: `${Math.max(props.clip.w * props.colWidth, 20)}px`,
  height: `${props.rowHeight - 16}px`,
  top: "8px",
  backgroundColor: props.color,
}));

const sampleName = computed(() => sample.value?.name ?? "Loading...");

const handleMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return;
  event.stopPropagation();

  emit("select", event);

  const target = event.target as HTMLElement;
  if (target.classList.contains("resize-handle-left")) {
    startResize("left", event);
  } else if (target.classList.contains("resize-handle-right")) {
    startResize("right", event);
  } else {
    startDrag(event);
  }
};

const startDrag = (event: MouseEvent): void => {
  isDragging.value = true;
  dragStartX.value = event.clientX;
  initialClipState.value = {
    x: props.clip.x,
    w: props.clip.w,
    startOffset: props.clip.startOffset,
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const startResize = (side: "left" | "right", event: MouseEvent): void => {
  isResizing.value = true;
  resizeSide.value = side;
  dragStartX.value = event.clientX;
  initialClipState.value = {
    x: props.clip.x,
    w: props.clip.w,
    startOffset: props.clip.startOffset,
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const handleMouseMove = (event: MouseEvent): void => {
  const deltaX = event.clientX - dragStartX.value;
  const deltaCols = Math.round(deltaX / props.colWidth);

  if (isDragging.value) {
    const newX = Math.max(0, initialClipState.value.x + deltaCols);
    emit("move", newX);
  } else if (isResizing.value) {
    if (resizeSide.value === "right") {
      const newW = Math.max(1, initialClipState.value.w + deltaCols);
      emit(
        "resize",
        "right",
        initialClipState.value.x,
        newW,
        initialClipState.value.startOffset,
      );
    } else {
      const effectiveDelta = Math.min(deltaCols, initialClipState.value.w - 1);
      const newX = initialClipState.value.x + effectiveDelta;
      const newW = initialClipState.value.w - effectiveDelta;
      const newStartOffset =
        initialClipState.value.startOffset + effectiveDelta;

      if (newX >= 0 && newW >= 1 && newStartOffset >= 0) {
        emit("resize", "left", newX, newW, newStartOffset);
      }
    }
  }
};

const handleMouseUp = (): void => {
  isDragging.value = false;
  isResizing.value = false;

  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
};

const handleDoubleClick = (event: MouseEvent): void => {
  event.stopPropagation();
  // Could open clip editor in the future
};

const handleContextMenu = (event: MouseEvent): void => {
  event.preventDefault();
  emit("delete");
};

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div
    class="audio-clip-item"
    :class="{
      selected: isSelected,
      dragging: isDragging,
      resizing: isResizing,
    }"
    :style="clipStyle"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="resize-handle-left" />
    <div class="clip-content">
      <div class="clip-name">{{ sampleName }}</div>
      <WaveformCanvas
        v-if="sample?.waveformData"
        :waveform-data="sample.waveformData"
        :start-offset="clip.startOffset"
        :clip-width="clip.w"
        :sample-duration-cols="Math.ceil(sample.duration * (tempo / 60) * 4)"
        :color="color"
      />
      <div v-else class="loading-placeholder" />
    </div>
    <div class="resize-handle-right" />
  </div>
</template>

<style scoped lang="scss">
.audio-clip-item {
  position: absolute;
  border-radius: var(--radius-sm);
  cursor: grab;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.1s;

  &.selected {
    border-color: var(--color-audio-clip-selected);
  }

  &.dragging {
    cursor: grabbing;
    opacity: 0.8;
  }

  &.resizing {
    cursor: ew-resize;
  }

  &:hover {
    .resize-handle-left,
    .resize-handle-right {
      opacity: 1;
    }
  }
}

.resize-handle-left,
.resize-handle-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 10;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 24px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 2px;
  }
}

.resize-handle-left {
  left: 0;

  &::after {
    left: 2px;
  }
}

.resize-handle-right {
  right: 0;

  &::after {
    right: 2px;
  }
}

.clip-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  overflow: hidden;
}

.clip-name {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  padding: 0 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.loading-placeholder {
  flex: 1;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255, 255, 255, 0.1) 4px,
    rgba(255, 255, 255, 0.1) 8px
  );
  border-radius: 2px;
}
</style>
