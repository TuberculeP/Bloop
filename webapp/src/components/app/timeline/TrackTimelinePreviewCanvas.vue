<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { MidiNote } from "../../../lib/utils/types";
import { TOTAL_NOTES } from "../../../lib/audio/pianoRollConstants";
import { useTimelineStore } from "../../../stores/timelineStore";
import { TICKS_PER_BEAT, ticksPerBar } from "../../../lib/audio/timeGrid";

const props = defineProps<{
  notes: MidiNote[];
  cols: number;
  colWidth: number;
  rowHeight: number;
  color: string;
  scrollLeft: number;
  viewportWidth: number;
}>();

const emit = defineEmits<{
  (e: "dblclick"): void;
}>();

const timelineStore = useTimelineStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isHovered = ref(false);
let dpr = 1;

const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  dpr = window.devicePixelRatio || 1;
  const width = props.viewportWidth;
  const height = props.rowHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  render();
};

const updateCanvasSize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const width = props.viewportWidth;
  const height = props.rowHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  render();
};

// Le canvas ne couvre plus que le viewport visible (largeur bornée à
// viewportWidth, pas cols*colWidth) : on traduit le contexte de -scrollLeft
// et on borne les boucles (temps, notes) à la plage de ticks visible, comme
// pianoGridRenderer.ts pour le piano roll.
const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = props.viewportWidth;
  const height = props.rowHeight;
  const scrollLeft = props.scrollLeft;

  // Fond transparent (comme pianoGridRenderer.ts) : on laisse l'arrière-plan
  // réel du site transparaître au lieu de peindre une couleur opaque en dur,
  // avec juste un léger survol semi-transparent au hover.
  ctx.clearRect(0, 0, width, height);
  if (isHovered.value) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  ctx.translate(-scrollLeft, 0);

  // Marge d'une colonne de part et d'autre de la plage strictement visible.
  const visibleTickStart = Math.max(
    0,
    Math.floor(scrollLeft / props.colWidth) - 1,
  );
  const visibleTickEnd = Math.min(
    props.cols,
    Math.ceil((scrollLeft + width) / props.colWidth) + 1,
  );

  // Une ligne à chaque temps, marquée en rose clair sur le premier temps
  // de chaque mesure (selon la signature rythmique du projet).
  const barLength = ticksPerBar(timelineStore.timeSignature);
  const beatStart = Math.max(0, Math.floor(visibleTickStart / TICKS_PER_BEAT));
  const beatEnd = Math.min(
    Math.ceil(props.cols / TICKS_PER_BEAT),
    Math.ceil(visibleTickEnd / TICKS_PER_BEAT),
  );
  for (let beat = beatStart; beat <= beatEnd; beat++) {
    const tick = beat * TICKS_PER_BEAT;
    const x = tick * props.colWidth - 0.5;
    const isBarStart = tick % barLength === 0;

    ctx.beginPath();
    ctx.strokeStyle = isBarStart
      ? "rgba(170, 27, 86, 0.7)"
      : "rgba(122, 15, 62, 0.5)";
    ctx.lineWidth = 1;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  if (props.notes.length > 0) {
    let minY = TOTAL_NOTES;
    let maxY = 0;
    for (const note of props.notes) {
      if (note.y < minY) minY = note.y;
      if (note.y > maxY) maxY = note.y;
    }

    const padding = 2;
    minY = Math.max(0, minY - padding);
    maxY = Math.min(TOTAL_NOTES - 1, maxY + padding);

    const range = Math.max(maxY - minY + 1, 5);
    const noteHeight = Math.max(2, Math.min(height / range - 1, 8));

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = props.color;

    for (const note of props.notes) {
      if (note.x + note.w < visibleTickStart || note.x > visibleTickEnd) {
        continue;
      }
      const x = note.x * props.colWidth;
      const y = ((note.y - minY) / range) * (height - noteHeight);
      const w = Math.max(note.w * props.colWidth - 1, 2);

      ctx.beginPath();
      ctx.roundRect(x, y, w, noteHeight, 1);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  ctx.restore();
};

let renderScheduled = false;
const scheduleRender = (): void => {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    render();
    renderScheduled = false;
  });
};

watch(
  [
    () => props.notes,
    () => props.color,
    isHovered,
    () => timelineStore.timeSignature,
    () => props.scrollLeft,
  ],
  scheduleRender,
  { deep: true },
);

let resizeScheduled = false;
const scheduleResize = (): void => {
  if (resizeScheduled) return;
  resizeScheduled = true;
  requestAnimationFrame(() => {
    updateCanvasSize();
    resizeScheduled = false;
  });
};

watch(
  [
    () => props.cols,
    () => props.colWidth,
    () => props.rowHeight,
    () => props.viewportWidth,
  ],
  scheduleResize,
);

onMounted(() => {
  initCanvas();
});
</script>

<template>
  <div
    class="track-timeline"
    :style="{ width: `${viewportWidth}px` }"
    @dblclick="emit('dblclick')"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped lang="scss">
.track-timeline {
  // Bornée à la largeur du viewport visible (pas cols*colWidth) et épinglée
  // juste après la colonne de header, comme TrackHeader.vue et
  // .piano-grid-container (PianoRoll.vue) : rien entre cet élément et
  // .timeline-scroll ne définit d'overflow, donc `sticky` se résout bien
  // contre lui.
  position: sticky;
  left: 180px;
  z-index: 5;
  cursor: pointer;

  canvas {
    display: block;
  }
}
</style>
