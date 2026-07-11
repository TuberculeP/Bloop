<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from "vue";
import type { AutomationLane } from "../../../lib/utils/types";
import { AutomationLaneRenderer } from "../../../lib/canvas/automationLaneRenderer";
import {
  useAutomationLane,
  type AutomationLaneActions,
} from "../../../composables/useAutomationLane";
import { AUTOMATABLE_PARAMS } from "../../../lib/audio/automation";
import { useTimelineStore } from "../../../stores/timelineStore";

const props = defineProps<{
  trackId?: string; // absent = lane du bus master
  lane: AutomationLane;
  cols: number;
  colWidth: number;
  trackColor: string;
  scrollLeft: number;
}>();

const emit = defineEmits<{
  (e: "remove"): void;
}>();

const LANE_HEIGHT = 160;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const rendererRef = shallowRef<AutomationLaneRenderer | null>(null);
const dpr = window.devicePixelRatio || 1;

const paramConfig = AUTOMATABLE_PARAMS[props.lane.parameter];

const timelineStore = useTimelineStore();

const actions: AutomationLaneActions = props.trackId
  ? {
      addPoint: (laneId, point) =>
        timelineStore.addAutomationPoint(props.trackId!, laneId, point),
      updatePoint: (laneId, pointId, updates) =>
        timelineStore.updateAutomationPoint(
          props.trackId!,
          laneId,
          pointId,
          updates,
        ),
      removePoint: (laneId, pointId) =>
        timelineStore.removeAutomationPoint(props.trackId!, laneId, pointId),
      setPoints: (laneId, points) =>
        timelineStore.setAutomationPoints(props.trackId!, laneId, points),
    }
  : {
      addPoint: timelineStore.addMasterAutomationPoint,
      updatePoint: timelineStore.updateMasterAutomationPoint,
      removePoint: timelineStore.removeMasterAutomationPoint,
      setPoints: timelineStore.setMasterAutomationPoints,
    };

const interaction = useAutomationLane(
  actions,
  props.lane,
  rendererRef,
  () => props.scrollLeft,
  () => props.cols,
);

const renderFrame = () => {
  if (!rendererRef.value) return;
  rendererRef.value.render(
    props.lane.points,
    interaction.hoveredPointId.value,
    interaction.selectedPointIds.value,
  );
  rendererRef.value.renderMarquee(interaction.marqueeRect.value);
};

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = props.cols * props.colWidth;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${LANE_HEIGHT}px`;
  canvas.width = width * dpr;
  canvas.height = LANE_HEIGHT * dpr;
  ctx.scale(dpr, dpr);

  rendererRef.value = new AutomationLaneRenderer(
    ctx,
    {
      cols: props.cols,
      colWidth: props.colWidth,
      trackColor: props.trackColor,
    },
    width,
    LANE_HEIGHT,
  );

  interaction.setCanvas(canvas);
  renderFrame();
});

watch(
  [
    () => props.lane.points,
    interaction.hoveredPointId,
    interaction.selectedPointIds,
    interaction.marqueeRect,
  ],
  renderFrame,
  { deep: true },
);

watch([() => props.cols, () => props.colWidth, () => props.trackColor], () => {
  const canvas = canvasRef.value;
  if (!canvas || !rendererRef.value) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = props.cols * props.colWidth;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${LANE_HEIGHT}px`;
  canvas.width = width * dpr;
  canvas.height = LANE_HEIGHT * dpr;
  ctx.scale(dpr, dpr);
  rendererRef.value.updateConfig(
    {
      cols: props.cols,
      colWidth: props.colWidth,
      trackColor: props.trackColor,
    },
    width,
    LANE_HEIGHT,
  );
  renderFrame();
});

onBeforeUnmount(() => {
  rendererRef.value = null;
});
</script>

<template>
  <div class="automation-lane-wrapper">
    <div class="lane-header">
      <span class="lane-param-label">{{ paramConfig.shortLabel }}</span>
      <button
        class="lane-remove-btn"
        title="Supprimer la lane"
        @click="emit('remove')"
      >
        ×
      </button>
    </div>
    <div class="lane-canvas-area">
      <canvas
        ref="canvasRef"
        class="lane-canvas"
        @mousemove="interaction.handleMouseMove"
        @mousedown="interaction.handleMouseDown"
        @mouseup="interaction.handleMouseUp"
        @dblclick="interaction.handleDblClick"
        @mouseleave="interaction.handleMouseLeave"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.automation-lane-wrapper {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-top: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  background: var(--color-bg-daw-deep);
}

.lane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 16px;
  background: var(--color-bg-daw-deep);
  border-right: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  height: 160px;
}

.lane-param-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lane-remove-btn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
  transition:
    color 0.1s,
    background 0.1s;

  &:hover {
    color: var(--color-status-error);
    background: rgba(var(--color-status-error-rgb), 0.1);
  }
}

.lane-canvas-area {
  overflow: hidden;
  height: 160px;
}

.lane-canvas {
  display: block;
  cursor: crosshair;
}
</style>
