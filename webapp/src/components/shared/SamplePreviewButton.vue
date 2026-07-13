<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import type { AudioSample } from "../../lib/utils/types";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import { formatDuration, formatElapsed } from "../../lib/utils/audioFormatter";

const props = defineProps<{
  sample: AudioSample;
}>();

const audioLibraryStore = useAudioLibraryStore();
const { previewingId } = storeToRefs(audioLibraryStore);

const isPlaying = computed(() => previewingId.value === props.sample.id);
const isLoading = computed(
  () => audioLibraryStore.getLoadingState(props.sample.id) === "loading",
);

const elapsed = ref(0);
let animationFrameId: number | null = null;

function tick() {
  elapsed.value = audioLibraryStore.getPreviewElapsed();
  animationFrameId = requestAnimationFrame(tick);
}

function stopTicking() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  elapsed.value = 0;
}

watch(
  isPlaying,
  (playing) => {
    if (playing) {
      tick();
    } else {
      stopTicking();
    }
  },
  { immediate: true },
);

onBeforeUnmount(stopTicking);

const timeLabel = computed(() =>
  isPlaying.value
    ? `${formatElapsed(elapsed.value)} / ${formatDuration(props.sample.duration)}`
    : formatDuration(props.sample.duration),
);

function toggle(event: MouseEvent) {
  event.stopPropagation();
  if (isPlaying.value) {
    audioLibraryStore.stopPreview();
  } else {
    audioLibraryStore.startPreview(props.sample);
  }
}
</script>

<template>
  <button
    type="button"
    class="sample-preview-btn"
    :class="{ playing: isPlaying }"
    :disabled="isLoading"
    @click="toggle"
  >
    <i v-if="isLoading" class="fas fa-spinner fa-spin" />
    <i v-else-if="isPlaying" class="fas fa-stop stop-icon" />
    <i v-else class="fas fa-play" />
    <span class="time-label">{{ timeLabel }}</span>
  </button>
</template>

<style scoped lang="scss">
.sample-preview-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: rgba(122, 15, 62, 0.3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-white-light);
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(122, 15, 62, 0.5);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  &.playing {
    border-color: var(--color-accent3-hover);
  }

  .stop-icon {
    color: var(--color-accent3-hover);
  }
}

.time-label {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--color-white-light);
  opacity: 0.8;
  white-space: nowrap;
}
</style>
