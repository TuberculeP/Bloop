<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

const props = defineProps<{
  waveformData: number[];
  startOffset: number;
  clipWidth: number;
  sampleDurationCols: number;
  color: string;
  colWidth: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const MIN_BAR_HEIGHT = 2;

const lightenHex = (hex: string, ratio: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "rgba(255,255,255,0.7)";
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * ratio);
  const r = mix(parseInt(result[1], 16));
  const g = mix(parseInt(result[2], 16));
  const b = mix(parseInt(result[3], 16));
  return `rgb(${r},${g},${b})`;
};

const drawWaveform = (): void => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.clearRect(0, 0, width, height);

  const data = props.waveformData;
  if (data.length === 0) return;

  const startRatio =
    props.sampleDurationCols > 0
      ? props.startOffset / props.sampleDurationCols
      : 0;
  const endRatio =
    props.sampleDurationCols > 0
      ? Math.min(
          1,
          (props.startOffset + props.clipWidth) / props.sampleDurationCols,
        )
      : 1;

  const startIndex = Math.floor(startRatio * data.length);
  const endIndex = Math.ceil(endRatio * data.length);
  const visibleData = data.slice(startIndex, endIndex);

  if (visibleData.length === 0) return;

  const midY = height / 2;
  const barStep = BAR_WIDTH + BAR_GAP;
  const barCount = Math.max(1, Math.floor(width / barStep));

  ctx.fillStyle = lightenHex(props.color, 0.65);

  for (let i = 0; i < barCount; i++) {
    const dataStart = Math.floor((i / barCount) * visibleData.length);
    const dataEnd = Math.max(
      dataStart + 1,
      Math.floor(((i + 1) / barCount) * visibleData.length),
    );

    let amplitude = 0;
    for (let j = dataStart; j < dataEnd; j++) {
      amplitude = Math.max(amplitude, visibleData[j]);
    }

    const barHeight = Math.max(MIN_BAR_HEIGHT, amplitude * midY * 0.85 * 2);
    const x = i * barStep;
    ctx.fillRect(x, midY - barHeight / 2, BAR_WIDTH, barHeight);
  }
};

onMounted(() => {
  drawWaveform();
});

watch(
  () => [
    props.waveformData,
    props.startOffset,
    props.clipWidth,
    props.sampleDurationCols,
    props.color,
    props.colWidth,
  ],
  () => {
    drawWaveform();
  },
  { deep: true },
);
</script>

<template>
  <canvas ref="canvasRef" class="waveform-canvas" />
</template>

<style scoped lang="scss">
.waveform-canvas {
  flex: 1;
  width: 100%;
  min-height: 0;
}
</style>
