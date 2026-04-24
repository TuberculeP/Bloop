<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { MidiNote } from "../../../lib/utils/types";
import { TOTAL_NOTES } from "../../../lib/audio/pianoRollConstants";

const props = defineProps<{
  notes: MidiNote[];
  cols: number;
  colWidth: number;
  rowHeight: number;
  color: string;
}>();

const emit = defineEmits<{
  (e: "dblclick"): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isHovered = ref(false);
let dpr = 1;

const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  dpr = window.devicePixelRatio || 1;
  const width = props.cols * props.colWidth;
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

  const width = props.cols * props.colWidth;
  const height = props.rowHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  render();
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = props.cols * props.colWidth;
  const height = props.rowHeight;

  ctx.fillStyle = isHovered.value ? "#1f1119" : "#1a0e15";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(122, 15, 62, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= Math.ceil(props.cols / 4); i++) {
    const x = i * 4 * props.colWidth - 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  ctx.stroke();

  if (props.notes.length === 0) return;

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
    const x = note.x * props.colWidth;
    const y = ((note.y - minY) / range) * (height - noteHeight);
    const w = Math.max(note.w * props.colWidth - 1, 2);

    ctx.beginPath();
    ctx.roundRect(x, y, w, noteHeight, 1);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
};

watch([() => props.notes, () => props.color, isHovered], render, {
  deep: true,
});
watch(
  [() => props.cols, () => props.colWidth, () => props.rowHeight],
  updateCanvasSize,
);

onMounted(() => {
  initCanvas();
});
</script>

<template>
  <div
    class="track-timeline"
    @dblclick="emit('dblclick')"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped lang="scss">
.track-timeline {
  position: relative;
  cursor: pointer;

  canvas {
    display: block;
  }
}
</style>
