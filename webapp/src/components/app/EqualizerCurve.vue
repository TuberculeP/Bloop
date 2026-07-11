<template>
  <div class="equalizer-container">
    <h3>Égaliseur 5 bandes</h3>
    <canvas
      ref="canvas"
      class="eq-canvas"
      :width="WIDTH"
      :height="HEIGHT"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    />
    <div class="eq-info">
      Draggez les points pour ajuster (±{{ MAX_GAIN }}dB)
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useSequencerStore } from "../../stores/sequencerStore";
import {
  EQ_BAND_COLORS,
  EQ_GAIN_MAX,
  EQ_GAIN_MIN,
} from "../../lib/audio/config";

const canvas = ref<HTMLCanvasElement | null>(null);
const store = useSequencerStore();

let isDragging = false;
let draggedId: string | null = null;

const WIDTH = 560;
const HEIGHT = 220;
const PADDING = 45;
const GRAPH_W = WIDTH - PADDING * 2;
const GRAPH_H = HEIGHT - PADDING * 2;
const POINT_R = 8;
const MAX_GAIN = EQ_GAIN_MAX;
const MIN_GAIN = EQ_GAIN_MIN;
const FREQS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const GAINS = [-18, -12, -6, 0, 6, 12, 18];

const bands = computed(() => store.eqBands);

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
    if (dist < POINT_R * 2) {
      isDragging = true;
      draggedId = band.id;
      break;
    }
  }
};

const onMouseMove = (e: MouseEvent) => {
  if (!canvas.value || !isDragging || !draggedId) return;
  const rect = canvas.value.getBoundingClientRect();
  store.updateEQBand(
    draggedId,
    Math.round(yToGain(e.clientY - rect.top) * 10) / 10,
  );
};

const onMouseUp = () => {
  isDragging = false;
  draggedId = null;
};

const draw = () => {
  const ctx = canvas.value?.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#061b33";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  FREQS.forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(freqToX(f), PADDING);
    ctx.lineTo(freqToX(f), HEIGHT - PADDING);
    ctx.stroke();
  });

  // 0dB line
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
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

  ctx.strokeStyle = "rgba(100,200,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.stroke();

  // Fill under curve
  ctx.fillStyle = "rgba(100,200,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(points[0].x, gainToY(0));
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, gainToY(0));
  ctx.closePath();
  ctx.fill();

  // Control points
  bands.value.forEach((band) => {
    const x = freqToX(band.frequency);
    const y = gainToY(band.gain);
    const color = EQ_BAND_COLORS[band.id] || "#4dabf7";
    const active = draggedId === band.id;

    if (active) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }

    ctx.fillStyle = active ? color : `${color}cc`;
    ctx.beginPath();
    ctx.arc(x, y, active ? POINT_R + 2 : POINT_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, active ? POINT_R + 2 : POINT_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(band.label, x, y - POINT_R - 14);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      `${band.gain > 0 ? "+" : ""}${band.gain.toFixed(1)}dB`,
      x,
      y - POINT_R - 3,
    );
  });

  // Axis labels
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  FREQS.forEach((f) => {
    const label =
      f < 1000 ? `${f}` : `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k`;
    ctx.fillText(label, freqToX(f), HEIGHT - PADDING + 15);
  });

  ctx.textAlign = "right";
  GAINS.forEach((g) =>
    ctx.fillText(`${g > 0 ? "+" : ""}${g}`, PADDING - 8, gainToY(g) + 3),
  );
};

watch(() => store.eqBands, draw, { deep: true });
onMounted(draw);
</script>

<style scoped lang="scss">
.equalizer-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .eq-canvas {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    cursor: crosshair;
    /* stylelint-disable-next-line color-no-hex -- fond du canvas EQ, teinte propre à ce composant */
    background-color: #0a1f33;
  }

  .eq-info {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }
}
</style>
