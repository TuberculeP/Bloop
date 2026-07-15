<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import { useTimelineStore } from "../../../stores/timelineStore";
import { ticksPerBar, snapToGrid } from "../../../lib/audio/timeGrid";

const props = defineProps<{
  cols: number;
  colWidth: number;
}>();

const emit = defineEmits<{
  (e: "seek", position: number): void;
}>();

const timelineStore = useTimelineStore();
const rulerRef = ref<HTMLElement | null>(null);
const isSeeking = ref(false);
const lastSeekPosition = ref<number | null>(null);

const measures = computed(() => {
  const barLength = ticksPerBar(timelineStore.timeSignature);
  const measureCount = Math.ceil(props.cols / barLength);
  return Array.from({ length: measureCount }, (_, i) => ({
    number: i + 1,
    position: i * barLength * props.colWidth,
  }));
});

const positionFromEvent = (event: MouseEvent): number => {
  const rect = rulerRef.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const rawPosition = Math.max(
    0,
    Math.min(Math.floor(x / props.colWidth), props.cols - 1),
  );
  const snapped = snapToGrid(rawPosition, timelineStore.subdivision);
  return Math.max(0, Math.min(snapped, props.cols - 1));
};

const emitSeek = (position: number): void => {
  if (lastSeekPosition.value === position) return;
  lastSeekPosition.value = position;
  emit("seek", position);
};

const handleMouseMove = (event: MouseEvent): void => {
  emitSeek(positionFromEvent(event));
};

const handleMouseUp = (): void => {
  isSeeking.value = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
};

const handleMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return;
  event.preventDefault();
  isSeeking.value = true;
  emitSeek(positionFromEvent(event));

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div
    class="timeline-ruler"
    :style="{ minWidth: `${180 + cols * colWidth}px` }"
  >
    <div class="ruler-header">Pistes</div>
    <div
      ref="rulerRef"
      class="ruler-measures"
      :class="{ seeking: isSeeking }"
      @mousedown="handleMouseDown"
    >
      <div class="ruler-content" :style="{ width: `${cols * colWidth}px` }">
        <div
          v-for="measure in measures"
          :key="measure.number"
          class="measure-marker"
          :style="{ left: `${measure.position}px` }"
        >
          <span class="measure-number">{{ measure.number }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.timeline-ruler {
  height: 30px;
  display: flex;
  background: var(--color-bg-primary-dark);
  border-bottom: 1px solid var(--color-border-secondary);
}

.ruler-header {
  width: 180px;
  min-width: 180px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  background: var(--color-bg-secondary-dark);
  border-right: 1px solid var(--color-border-secondary);
  position: sticky;
  left: 0;
  z-index: 10;
}

.ruler-measures {
  flex: 1;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: var(--color-bg-secondary-dark);

  &:hover {
    background: var(--color-bg-daw-active);
  }

  &.seeking {
    cursor: grabbing;
  }
}

.ruler-content {
  position: relative;
  height: 100%;
}

.measure-marker {
  position: absolute;
  top: 0;
  height: 100%;
  border-left: 1px solid var(--color-border-secondary);
  padding-left: 6px;
  display: flex;
  align-items: center;
}

.measure-number {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  user-select: none;
}
</style>
