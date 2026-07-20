<template>
  <div class="track-equalizer">
    <canvas
      ref="canvas"
      class="eq-canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import type { EQBand } from "../../../lib/utils/types";
import {
  EQ_BAND_COLORS,
  EQ_GAIN_MAX,
  EQ_GAIN_MIN,
} from "../../../lib/audio/config";
import { useRafSchedule } from "../../../composables/useRafSchedule";

const props = defineProps<{
  bands: EQBand[];
}>();

const emit = defineEmits<{
  (e: "update", bandId: string, gain: number): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const dpr = window.devicePixelRatio || 1;

let isDragging = false;
let draggedId: string | null = null;

const WIDTH = 280;
const HEIGHT = 160;
const PADDING = 30;
const GRAPH_W = WIDTH - PADDING * 2;
const GRAPH_H = HEIGHT - PADDING * 2;
const POINT_R = 6;
const MAX_GAIN = EQ_GAIN_MAX;
const MIN_GAIN = EQ_GAIN_MIN;
const FREQS = [50, 200, 1000, 5000, 20000];
const GAINS = [-12, 0, 12];

const bands = computed(() => props.bands);

const logScale = (freq: number) =>
  (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));

const freqToX = (freq: number) => PADDING + logScale(freq) * GRAPH_W;
const gainToY = (gain: number) =>
  HEIGHT - PADDING - ((gain - MIN_GAIN) / (MAX_GAIN - MIN_GAIN)) * GRAPH_H;
const yToGain = (y: number) =>
  Math.max(
    MIN_GAIN,
    Math.min(
      MAX_GAIN,
      ((HEIGHT - PADDING - y) / GRAPH_H) * (MAX_GAIN - MIN_GAIN) + MIN_GAIN,
    ),
  );

const onMouseDown = (e: MouseEvent) => {
  if (!canvas.value) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (const band of bands.value) {
    const dist = Math.hypot(
      x - freqToX(band.frequency),
      y - gainToY(band.gain),
    );
    if (dist < POINT_R * 2.5) {
      isDragging = true;
      draggedId = band.id;
      break;
    }
  }
};

const onMouseMove = (e: MouseEvent) => {
  if (!canvas.value || !isDragging || !draggedId) return;
  const rect = canvas.value.getBoundingClientRect();
  const newGain = Math.round(yToGain(e.clientY - rect.top) * 10) / 10;
  emit("update", draggedId, newGain);
};

const onMouseUp = () => {
  isDragging = false;
  draggedId = null;
};

const draw = () => {
  const ctx = canvas.value?.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#1a0e15";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Grid vertical (frequencies)
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  FREQS.forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(freqToX(f), PADDING);
    ctx.lineTo(freqToX(f), HEIGHT - PADDING);
    ctx.stroke();
  });

  // 0dB line
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(PADDING, gainToY(0));
  ctx.lineTo(WIDTH - PADDING, gainToY(0));
  ctx.stroke();

  // Other gain lines
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  GAINS.filter((g) => g !== 0).forEach((g) => {
    ctx.beginPath();
    ctx.moveTo(PADDING, gainToY(g));
    ctx.lineTo(WIDTH - PADDING, gainToY(g));
    ctx.stroke();
  });

  // Curve
  const sorted = [...bands.value].sort((a, b) => a.frequency - b.frequency);
  const points: { x: number; y: number }[] = [];

  if (sorted.length > 0) {
    for (let x = PADDING; x <= freqToX(sorted[0].frequency); x += 2) {
      points.push({ x, y: gainToY(sorted[0].gain) });
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const x0 = freqToX(sorted[i].frequency);
      const x1 = freqToX(sorted[i + 1].frequency);
      for (let x = x0; x <= x1; x += 2) {
        const t = (x - x0) / (x1 - x0);
        const eased = t * t * (3 - 2 * t);
        points.push({
          x,
          y: gainToY(
            sorted[i].gain + (sorted[i + 1].gain - sorted[i].gain) * eased,
          ),
        });
      }
    }

    const last = sorted[sorted.length - 1];
    for (let x = freqToX(last.frequency); x <= WIDTH - PADDING; x += 2) {
      points.push({ x, y: gainToY(last.gain) });
    }
  }

  // Draw curve
  if (points.length > 0) {
    ctx.strokeStyle = "rgba(255,63,180,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.stroke();

    // Fill under curve
    ctx.fillStyle = "rgba(255,63,180,0.08)";
    ctx.beginPath();
    ctx.moveTo(points[0].x, gainToY(0));
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, gainToY(0));
    ctx.closePath();
    ctx.fill();
  }

  // Control points
  bands.value.forEach((band) => {
    const x = freqToX(band.frequency);
    const y = gainToY(band.gain);
    const color = EQ_BAND_COLORS[band.id] || "#ff3fb4";
    const active = draggedId === band.id;

    if (active) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = active ? color : `${color}cc`;
    ctx.beginPath();
    ctx.arc(x, y, active ? POINT_R + 1 : POINT_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, active ? POINT_R + 1 : POINT_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${band.gain > 0 ? "+" : ""}${band.gain.toFixed(0)}`,
      x,
      y - POINT_R - 4,
    );
  });

  // Frequency labels
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  [60, 200, 1000, 3000, 10000].forEach((f) => {
    const label = f < 1000 ? `${f}` : `${f / 1000}k`;
    ctx.fillText(label, freqToX(f), HEIGHT - PADDING + 12);
  });
};

const scheduleDraw = useRafSchedule(draw);

watch(() => props.bands, scheduleDraw, { deep: true });

onMounted(() => {
  const el = canvas.value;
  if (!el) return;
  el.style.width = `${WIDTH}px`;
  el.style.height = `${HEIGHT}px`;
  el.width = WIDTH * dpr;
  el.height = HEIGHT * dpr;
  el.getContext("2d")?.scale(dpr, dpr);
  draw();
});
</script>

<style scoped lang="scss">
.track-equalizer {
  display: flex;
  flex-direction: column;
  align-items: center;

  .eq-canvas {
    border: 1px solid rgba(var(--color-accent3-rgb), 0.4);
    border-radius: 6px;
    cursor: crosshair;
  }
}
</style>
