<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRafSchedule } from "../../../../composables/useRafSchedule";

const props = defineProps<{
  waveformData: number[];
  startOffset: number;
  clipWidth: number;
  sampleDurationCols: number;
  color: string;
  colWidth: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let lastDeviceWidth = 0;
let lastDeviceHeight = 0;

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

  // canvas.width/height ne doivent être réassignés que quand la taille réelle
  // change : le faire à chaque draw force une réallocation complète du
  // backing-store, coûteuse quand elle est répétée à chaque frame pendant un
  // zoom continu sur de nombreux clips visibles.
  const deviceWidth = width * window.devicePixelRatio;
  const deviceHeight = height * window.devicePixelRatio;
  if (deviceWidth !== lastDeviceWidth || deviceHeight !== lastDeviceHeight) {
    canvas.width = deviceWidth;
    canvas.height = deviceHeight;
    lastDeviceWidth = deviceWidth;
    lastDeviceHeight = deviceHeight;
  }
  // setTransform (absolu) plutôt que scale (relatif) : sûr à rejouer à
  // chaque draw même quand le resize ci-dessus est skip, sans accumuler
  // l'échelle.
  ctx.setTransform(
    window.devicePixelRatio,
    0,
    0,
    window.devicePixelRatio,
    0,
    0,
  );

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

  // Si le clip a été étiré (resize) au-delà de la durée réelle du sample,
  // on ne dessine des barres que jusqu'à la fin réelle de l'audio — le
  // reste du clip reste vide plutôt que d'étirer artificiellement la
  // waveform pour remplir toute la largeur.
  const audioPixelWidth =
    props.sampleDurationCols > 0
      ? Math.min(
          width,
          (props.sampleDurationCols - props.startOffset) * props.colWidth,
        )
      : width;
  const barCount = Math.max(0, Math.floor(audioPixelWidth / barStep));
  if (barCount === 0) return;

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

const scheduleDraw = useRafSchedule(drawWaveform);

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
  scheduleDraw,
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
