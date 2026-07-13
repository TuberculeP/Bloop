<template>
  <svg ref="svgRef" :viewBox="`10 10 ${WIDTH - 20} ${HEIGHT - 20}`">
    <g id="graphy">
      <path
        v-for="(path, index) in paths"
        :key="index"
        :d="path"
        class="wave"
      />
    </g>
  </svg>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const NUM_LINES = ref(15);
const NUM_POINTS = ref(30);

const svgRef = ref(null);
const paths = ref([]);
const noiseBackground = [];

const WIDTH = ref(2000);
const HEIGHT = ref(1000);
let dotPoints = [];

function range(start, end, step) {
  const result = [];

  for (let i = start; i <= end; i += step) {
    result.push(i);
  }

  return result;
}

function getPoint(cx, cy, lineIndex, y) {
  return function (n) {
    const pointIndex = Math.round(n / (WIDTH.value / NUM_POINTS.value));

    const bg = noiseBackground[lineIndex][pointIndex] || 0;

    const dx = (cx - n) * 5;
    const dy = cy - y;

    const distance = Math.sqrt(dx * dx + dy * dy) * 0.5 + 15;

    const pointHeight = (bg / distance) * 5;

    return [n, pointHeight];
  };
}

function getPath(cx, cy, lineIndex) {
  const y = (HEIGHT.value / NUM_LINES.value) * lineIndex;

  const heights = dotPoints.map(getPoint(cx, cy, lineIndex, y));

  return (
    `M0,${y - heights[0][1]} ` +
    `S${heights
      .slice(1)
      .map(([x, h]) => `${x},${(y - h).toFixed(5)}`)
      .join(" ")} ` +
    `L${WIDTH.value},${HEIGHT.value} 0,${HEIGHT.value} Z`
  );
}

function draw(cx, cy) {
  paths.value = Array.from({ length: NUM_LINES.value }, (_, i) =>
    getPath(cx, cy, i),
  );
}

function init() {
  dotPoints = range(0, WIDTH.value, WIDTH.value / NUM_POINTS.value);

  noiseBackground.length = 0;

  for (let i = 0; i < NUM_LINES.value; i++) {
    noiseBackground.push(dotPoints.map(() => (Math.random() - 0.5) * 1500));
  }

  draw(WIDTH.value / 2, HEIGHT.value / 2);
}

let rafId = null;
let mouseX = WIDTH.value / 2;
let mouseY = HEIGHT.value / 2;

function handleMouseMove(event) {
  const rect = svgRef.value.getBoundingClientRect();

  mouseX = ((event.clientX - rect.left) / rect.width) * WIDTH.value;

  mouseY = ((event.clientY - rect.top) / rect.height) * HEIGHT.value;

  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      draw(mouseX, mouseY);
      rafId = null;
    });
  }
}

let resizeObserver = null;
let resizeRafId = null;

function updateSize() {
  const rect = svgRef.value.getBoundingClientRect();

  WIDTH.value = Math.round(rect.width) || WIDTH.value;
  HEIGHT.value = Math.round(rect.height) || HEIGHT.value;

  NUM_LINES.value = Math.max(
    1,
    Math.round((HEIGHT.value / window.innerHeight) * 15),
  );
  NUM_POINTS.value = Math.max(
    1,
    Math.round((WIDTH.value / window.innerWidth) * 50),
  );

  mouseX = WIDTH.value / 2;
  mouseY = HEIGHT.value / 2;

  init();
}

function handleResize() {
  if (resizeRafId) return;

  resizeRafId = requestAnimationFrame(() => {
    updateSize();
    resizeRafId = null;
  });
}

onMounted(() => {
  updateSize();

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(svgRef.value);

  window.addEventListener("mousemove", handleMouseMove);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();

  window.removeEventListener("mousemove", handleMouseMove);

  if (rafId) cancelAnimationFrame(rafId);
  if (resizeRafId) cancelAnimationFrame(resizeRafId);
});
</script>

<style scoped>
.container {
  height: 100vh;
  width: 100%;
}

svg {
  width: 100%;
  height: 100%;
  shape-rendering: geometricPrecision;
}

.wave {
  stroke: color-mix(in srgb, var(--color-secondary) 29%, transparent);
  fill: transparent;

  stroke-width: 0.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
</style>
