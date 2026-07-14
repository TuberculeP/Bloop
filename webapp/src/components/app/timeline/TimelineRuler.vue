<script setup lang="ts">
import { computed } from "vue";
import { useTimelineStore } from "../../../stores/timelineStore";
import { ticksPerBar } from "../../../lib/audio/timeGrid";

const props = defineProps<{
  cols: number;
  colWidth: number;
  scrollLeft: number;
}>();

const emit = defineEmits<{
  (e: "seek", position: number): void;
}>();

const timelineStore = useTimelineStore();

const measures = computed(() => {
  const barLength = ticksPerBar(timelineStore.timeSignature);
  const measureCount = Math.ceil(props.cols / barLength);
  return Array.from({ length: measureCount }, (_, i) => ({
    number: i + 1,
    position: i * barLength * props.colWidth,
  }));
});

const handleClick = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX - rect.left;
  const position = Math.floor(x / props.colWidth);
  emit("seek", Math.max(0, Math.min(position, props.cols - 1)));
};
</script>

<template>
  <div
    class="timeline-ruler"
    :style="{ minWidth: `${180 + cols * colWidth}px` }"
  >
    <div class="ruler-header">Pistes</div>
    <div class="ruler-measures" @click="handleClick">
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
