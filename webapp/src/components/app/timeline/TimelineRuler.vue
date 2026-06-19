<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  cols: number;
  colWidth: number;
  scrollLeft: number;
}>();

const emit = defineEmits<{
  (e: "seek", position: number): void;
}>();

const measures = computed(() => {
  const measureCount = Math.ceil(props.cols / 4);
  return Array.from({ length: measureCount }, (_, i) => ({
    number: i + 1,
    position: i * 4 * props.colWidth,
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
  <div class="timeline-ruler" :style="{ minWidth: `${180 + cols * colWidth}px` }">
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
  background: #1a0e15;
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);
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
  background: #2d0f20;
  border-right: 1px solid rgba(122, 15, 62, 0.5);
  position: sticky;
  left: 0;
  z-index: 10;
}

.ruler-measures {
  flex: 1;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: #2d0f20;

  &:hover {
    background: #3d1528;
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
  border-left: 1px solid rgba(122, 15, 62, 0.5);
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
