<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { MidiNote } from "../../../lib/utils/types";
import { TOTAL_NOTES } from "../../../lib/audio/pianoRollConstants";
import { useTimelineStore } from "../../../stores/timelineStore";
import {
  TICKS_PER_BEAT,
  ticksPerBar,
  getVisibleTickRange,
  tickToGridLineX,
} from "../../../lib/audio/timeGrid";
import { useRafSchedule } from "../../../composables/useRafSchedule";

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

  const [visibleTickStart, visibleTickEnd] = getVisibleTickRange(
    scrollLeft,
    width,
    props.colWidth,
    props.cols,
  );

  // Une ligne à chaque temps, peu voyante (même teinte/opacité que les lignes
  // de mesure/subdivision des pistes de clips audio, voir AudioClipRow.vue) :
  // cette preview n'est qu'un aperçu miniature, pas une surface d'édition —
  // contrairement au piano roll qui garde un contraste plus fort exprès.
  const barLength = ticksPerBar(timelineStore.timeSignature);
  const beatStart = Math.max(0, Math.floor(visibleTickStart / TICKS_PER_BEAT));
  const beatEnd = Math.min(
    Math.ceil(props.cols / TICKS_PER_BEAT),
    Math.ceil(visibleTickEnd / TICKS_PER_BEAT),
  );
  for (let beat = beatStart; beat <= beatEnd; beat++) {
    const tick = beat * TICKS_PER_BEAT;
    const x = tickToGridLineX(tick, props.colWidth);
    const isBarStart = tick % barLength === 0;

    ctx.beginPath();
    ctx.strokeStyle = isBarStart
      ? "rgba(122, 15, 62, 0.3)"
      : "rgba(122, 15, 62, 0.12)";
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

const scheduleRender = useRafSchedule(render);

// scrollLeft est un nombre : un watch séparé (sans deep) évite qu'un scroll
// ne déclenche une traversée profonde de `notes` à chaque tick simplement
// pour détecter le changement de ce scalaire.
watch(
  [
    () => props.notes,
    () => props.color,
    isHovered,
    () => timelineStore.timeSignature,
  ],
  scheduleRender,
  { deep: true },
);
watch(() => props.scrollLeft, scheduleRender);

const scheduleResize = useRafSchedule(updateCanvasSize);

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
