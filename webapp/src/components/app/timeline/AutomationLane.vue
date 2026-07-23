<script setup lang="ts">
import {
  ref,
  shallowRef,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { vOnClickOutside } from "@vueuse/components";
import type { AutomationLane } from "../../../lib/utils/types";
import { AutomationLaneRenderer } from "../../../lib/canvas/automationLaneRenderer";
import {
  useAutomationLane,
  type AutomationLaneActions,
} from "../../../composables/useAutomationLane";
import { getEffectDefinition } from "../../../lib/audio/effects";
import { getChannelParamMeta } from "../../../lib/audio/channelParams";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useRafSchedule } from "../../../composables/useRafSchedule";

const props = defineProps<{
  trackId?: string; // absent = lane du bus master
  lane: AutomationLane;
  cols: number;
  colWidth: number;
  trackColor: string;
  scrollLeft: number;
  viewportWidth: number;
}>();

const emit = defineEmits<{
  (e: "remove"): void;
}>();

const LANE_HEIGHT = 160;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const rendererRef = shallowRef<AutomationLaneRenderer | null>(null);
const dpr = window.devicePixelRatio || 1;

const timelineStore = useTimelineStore();

const resolvedTrackId = props.trackId ?? "master";

// Résout dynamiquement le libellé de la cible (pseudo-effet "channel" pour le
// fader volume/pan, sinon label du paramètre déclaré par l'effet visé) plutôt
// que de dépendre d'un enum fermé de paramètres — dans les deux cas,
// `paramId` n'est qu'une clé de lookup opaque contre un registre statique,
// jamais une valeur comparée en dur ici.
const channelParamMeta = computed(() => {
  const target = props.lane.target;
  return target.effectId === "channel"
    ? getChannelParamMeta(target.paramId)
    : undefined;
});

const paramLabel = computed<string>(() => {
  const target = props.lane.target;
  if (target.effectId === "channel") {
    return channelParamMeta.value?.shortLabel ?? target.paramId;
  }

  const effects = props.trackId
    ? (timelineStore.tracks.find((t) => t.id === props.trackId)?.effects ?? [])
    : timelineStore.masterEffects;
  const effectConfig = effects.find((e) => e.id === target.effectId);
  const definition = effectConfig
    ? getEffectDefinition(effectConfig.type)
    : undefined;
  const paramMeta = definition?.params.find((p) => p.id === target.paramId);
  return paramMeta?.shortLabel ?? paramMeta?.label ?? target.paramId;
});

// Repères haut/bas de l'axe vertical de la courbe — utile pour un paramètre
// bipolaire comme le pan, où "en haut" et "en bas" ne sont pas évidents sans
// indication (contrairement au volume, où le haut = plus fort va de soi).
const axisLabels = computed<{ topLabel?: string; bottomLabel?: string }>(() => {
  const meta = channelParamMeta.value;
  return meta ? { topLabel: meta.topLabel, bottomLabel: meta.bottomLabel } : {};
});

const actions: AutomationLaneActions = {
  addPoint: (laneId, point) =>
    timelineStore.addAutomationPoint(resolvedTrackId, laneId, point),
  updatePoint: (laneId, pointId, updates) =>
    timelineStore.updateAutomationPoint(
      resolvedTrackId,
      laneId,
      pointId,
      updates,
    ),
  removePoint: (laneId, pointId) =>
    timelineStore.removeAutomationPoint(resolvedTrackId, laneId, pointId),
  setPoints: (laneId, points) =>
    timelineStore.setAutomationPoints(resolvedTrackId, laneId, points),
};

const interaction = useAutomationLane(
  actions,
  props.lane,
  rendererRef,
  () => props.scrollLeft,
  () => props.cols,
  () => timelineStore.subdivision,
);

const displayedPoints = () => {
  const preview = interaction.previewPoints.value;
  if (!preview) return props.lane.points;
  return props.lane.points.map((p) => {
    const pos = preview.get(p.id);
    return pos ? { ...p, x: pos.x, y: pos.y } : p;
  });
};

const renderFrame = () => {
  if (!rendererRef.value) return;
  rendererRef.value.render(
    displayedPoints(),
    interaction.hoveredPointId.value,
    interaction.selectedPointIds.value,
    interaction.marqueeRect.value,
    props.scrollLeft,
  );
};

const scheduleRender = useRafSchedule(renderFrame);

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = props.viewportWidth;
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
      timeSignature: timelineStore.timeSignature,
      subdivision: timelineStore.subdivision,
      ...axisLabels.value,
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
    interaction.previewPoints,
  ],
  scheduleRender,
  { deep: true },
);

const resizeCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas || !rendererRef.value) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = props.viewportWidth;
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
      timeSignature: timelineStore.timeSignature,
      subdivision: timelineStore.subdivision,
      ...axisLabels.value,
    },
    width,
    LANE_HEIGHT,
  );
  renderFrame();
};

const scheduleResize = useRafSchedule(resizeCanvas);

watch(
  [
    () => props.cols,
    () => props.colWidth,
    () => props.viewportWidth,
    () => props.trackColor,
    () => timelineStore.timeSignature,
    () => timelineStore.subdivision,
  ],
  scheduleResize,
);

// scrollLeft est un nombre : watch séparé (sans deep) pour ne redessiner que
// le contenu (translate + bornage) sans redimensionner le canvas.
watch(() => props.scrollLeft, scheduleRender);

onBeforeUnmount(() => {
  rendererRef.value = null;
});
</script>

<template>
  <div
    class="automation-lane-wrapper"
    v-on-click-outside="interaction.clearSelection"
  >
    <div class="lane-header">
      <span class="lane-param-label">{{ paramLabel }}</span>
      <button
        class="lane-remove-btn"
        title="Supprimer la lane"
        @click="emit('remove')"
      >
        ×
      </button>
    </div>
    <div class="lane-canvas-area" :style="{ width: `${viewportWidth}px` }">
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
  // Bornée à la largeur du viewport visible (pas cols*colWidth) et épinglée
  // juste après la colonne de header, comme .track-timeline
  // (TrackTimelinePreviewCanvas.vue) et .piano-grid-container (PianoRoll.vue).
  position: sticky;
  left: 180px;
  z-index: 5;
  overflow: hidden;
  height: 160px;
}

.lane-canvas {
  display: block;
  cursor: crosshair;
}
</style>
