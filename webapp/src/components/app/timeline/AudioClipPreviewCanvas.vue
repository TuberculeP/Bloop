<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { AudioClip } from "../../../lib/utils/types";
import { useAudioLibraryStore } from "../../../stores/audioLibraryStore";

const props = defineProps<{
  clips: AudioClip[];
  cols: number;
  colWidth: number;
  rowHeight: number;
  color: string;
}>();

const emit = defineEmits<{
  (e: "dblclick"): void;
}>();

const audioLibraryStore = useAudioLibraryStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isHovered = ref(false);
let dpr = 1;

onMounted(() => {
  audioLibraryStore.initialize();
  initCanvas();
});

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

  for (const clip of props.clips) {
    drawClip(ctx, clip);
  }
};

const drawClip = (ctx: CanvasRenderingContext2D, clip: AudioClip) => {
  const x = clip.x * props.colWidth;
  const clipWidth = Math.max(clip.w * props.colWidth - 2, 4);
  const clipHeight = props.rowHeight - 8;
  const y = 4;

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = props.color;
  ctx.beginPath();
  ctx.roundRect(x, y, clipWidth, clipHeight, 3);
  ctx.fill();

  const waveformData = getWaveformData(clip);
  if (waveformData.length > 0) {
    drawWaveform(
      ctx,
      clip,
      waveformData,
      x + 1,
      y + 1,
      clipWidth - 2,
      clipHeight - 2,
    );
  } else {
    drawPlaceholderPattern(ctx, x + 1, y + 1, clipWidth - 2, clipHeight - 2);
  }

  ctx.globalAlpha = 1;
};

const getWaveformData = (clip: AudioClip): number[] => {
  const sample = audioLibraryStore.getSample(clip.sampleId);
  return sample?.waveformData ?? [];
};

const drawWaveform = (
  ctx: CanvasRenderingContext2D,
  clip: AudioClip,
  data: number[],
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const midY = y + height / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();

  for (let i = 0; i < data.length; i++) {
    const px = x + (i / data.length) * width;
    const py = midY - data[i] * (height / 2) * 0.8;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  for (let i = data.length - 1; i >= 0; i--) {
    const px = x + (i / data.length) * width;
    const py = midY + data[i] * (height / 2) * 0.8;
    ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
};

const drawPlaceholderPattern = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;

  const spacing = 4;
  for (let i = -height; i < width + height; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + height, y + height);
    ctx.stroke();
  }

  ctx.restore();
};

watch([() => props.clips, () => props.color, isHovered], render, {
  deep: true,
});
watch(
  [() => props.cols, () => props.colWidth, () => props.rowHeight],
  updateCanvasSize,
);
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
