<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import type { NoteName } from "../../../../lib/utils/types";
import { PianoKeysRenderer } from "../../../../lib/canvas/pianoKeysRenderer";

const props = defineProps<{
  activeNotes: Set<NoteName>;
  gridHeight: number;
  scrollTop: number;
  viewportHeight: number;
}>();

const emit = defineEmits<{
  (e: "note-start", note: NoteName): void;
  (e: "note-stop", note: NoteName): void;
  (e: "all-notes-stop"): void;
}>();

const PIANO_WIDTH = 180;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const renderer = ref<PianoKeysRenderer | null>(null);
const isMouseDown = ref(false);
const currentNote = ref<NoteName | null>(null);
let dpr = 1;

const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  dpr = window.devicePixelRatio || 1;
  const width = PIANO_WIDTH;
  const height = props.viewportHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  renderer.value = new PianoKeysRenderer(ctx, width, height);
  render();
};

const updateCanvasSize = () => {
  const canvas = canvasRef.value;
  if (!canvas || !renderer.value) return;

  const width = PIANO_WIDTH;
  const height = props.viewportHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  renderer.value.updateSize(width, height);
  render();
};

const render = () => {
  if (!renderer.value) return;
  renderer.value.render(props.activeNotes, props.scrollTop);
};

// Le canvas ne couvre plus que le viewport visible : les coordonnées
// canvas-local sont recalées en coordonnées monde en ajoutant scrollTop,
// comme dans PianoGridCanvas.vue.
const toWorldPos = (event: MouseEvent): { x: number; y: number } => {
  const rect = canvasRef.value!.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: props.scrollTop + (event.clientY - rect.top),
  };
};

const handleMouseMove = (event: MouseEvent) => {
  if (!renderer.value) return;
  const { x, y: worldY } = toWorldPos(event);

  const note = renderer.value.getKeyAtPosition(x, worldY);
  renderer.value.setHoveredKey(note);
  render();

  if (isMouseDown.value && note && note !== currentNote.value) {
    if (currentNote.value) {
      emit("note-stop", currentNote.value);
    }
    currentNote.value = note;
    emit("note-start", note);
  }
};

const handleMouseDown = (event: MouseEvent) => {
  if (!renderer.value) return;
  event.preventDefault();

  const { x, y: worldY } = toWorldPos(event);

  const note = renderer.value.getKeyAtPosition(x, worldY);
  if (note) {
    isMouseDown.value = true;
    currentNote.value = note;
    emit("note-start", note);
  }
};

const handleMouseUp = () => {
  if (isMouseDown.value) {
    isMouseDown.value = false;
    currentNote.value = null;
    emit("all-notes-stop");
  }
};

const handleMouseLeave = () => {
  if (renderer.value) {
    renderer.value.setHoveredKey(null);
    render();
  }
};

const handleGlobalMouseUp = () => {
  if (isMouseDown.value) {
    isMouseDown.value = false;
    currentNote.value = null;
    emit("all-notes-stop");
  }
};

// scrollTop est un nombre : un watch séparé (sans deep) évite qu'un scroll
// ne déclenche une traversée profonde de `activeNotes` à chaque tick
// simplement pour détecter le changement de ce scalaire.
watch(() => props.activeNotes, render, { deep: true });
watch(() => props.scrollTop, render);
watch(() => props.viewportHeight, updateCanvasSize);

onMounted(() => {
  initCanvas();
  document.addEventListener("mouseup", handleGlobalMouseUp);
});

onBeforeUnmount(() => {
  document.removeEventListener("mouseup", handleGlobalMouseUp);
});
</script>

<template>
  <div class="piano-keys-canvas" :style="{ height: `${gridHeight}px` }">
    <canvas
      ref="canvasRef"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    />
  </div>
</template>

<style scoped lang="scss">
.piano-keys-canvas {
  // La hauteur complète (spacer) donne à .piano-keys-container sa vraie
  // plage de scroll vertical ; le canvas lui-même (voir plus bas) ne fait
  // que la hauteur du viewport visible et reste épinglé en haut pendant le
  // scroll.
  position: relative;
  width: 180px;
  min-width: 180px;
  flex-shrink: 0;
  background: var(--color-piano-key-black);
  /* stylelint-disable-next-line color-no-hex -- même bordure grise que la version DOM équivalente (PianoKeys.vue) */
  border-right: 2px solid #333;
  box-sizing: border-box;
  cursor: pointer;

  canvas {
    position: sticky;
    top: 0;
    display: block;
  }
}
</style>
