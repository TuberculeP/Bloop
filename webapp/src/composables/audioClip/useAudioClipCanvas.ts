import { ref, watch, type Ref } from "vue";
import type { AudioClip, TimeSignature } from "../../lib/utils/types";
import { ticksPerSecond } from "../../lib/audio/timeGrid";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import {
  AudioClipRenderer,
  type ClipRenderData,
} from "../../lib/canvas/audioClipRenderer";
import { useRafSchedule } from "../useRafSchedule";
import type { AudioClipDragState } from "./useAudioClipDrag";
import type { AudioClipResizingState } from "./useAudioClipResize";
import type { SelectionRect } from "./useAudioClipSelection";

interface UseAudioClipCanvasConfig {
  cols: () => number;
  colWidth: () => number;
  rowHeight: () => number;
  timeSignature: () => TimeSignature;
  subdivision: () => number;
  clips: () => AudioClip[];
  trackColor: () => string;
  tempo: () => number;
  selectedClipIds: Ref<Set<string>>;
  dragState: Ref<AudioClipDragState | null>;
  dragPreviewDeltaTicks: Ref<number | null>;
  resizingState: Ref<AudioClipResizingState | null>;
  resizePreviewDeltaTicks: Ref<number | null>;
  selectionRect: Ref<SelectionRect | null>;
  scrollLeft: () => number;
  viewportWidth: () => number;
  playbackPosition: () => number;
  isPlaying: () => boolean;
}

export function useAudioClipCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  config: UseAudioClipCanvasConfig,
) {
  const audioLibraryStore = useAudioLibraryStore();
  const renderer = ref<AudioClipRenderer | null>(null);
  // Taille du wrapper DOM, mise à jour uniquement dans le même chemin
  // throttlé (rAF) que le resize du canvas — voir usePianoGridCanvas.ts pour
  // le même principe appliqué au piano roll — sinon le binding de style du
  // wrapper suit la réactivité Vue brute indépendamment du throttle.
  const containerSize = ref({
    width: config.viewportWidth(),
    height: config.rowHeight(),
  });
  let dpr = 1;
  let lastDeviceWidth = 0;
  let lastDeviceHeight = 0;

  const rendererConfig = () => ({
    cols: config.cols(),
    colWidth: config.colWidth(),
    rowHeight: config.rowHeight(),
    timeSignature: config.timeSignature(),
    subdivision: config.subdivision(),
  });

  const buildClipRenderData = (clip: AudioClip): ClipRenderData => {
    const sample = audioLibraryStore.getSample(clip.sampleId);

    const isDragging =
      config.dragState.value?.clipsInitialPos.has(clip.id) ?? false;
    const isResizing =
      config.resizingState.value?.clipsInitialState.has(clip.id) ?? false;

    let previewX: number | undefined;
    let previewW: number | undefined;
    let previewStartOffset: number | undefined;

    if (isDragging && config.dragPreviewDeltaTicks.value !== null) {
      const initial = config.dragState.value!.clipsInitialPos.get(clip.id)!;
      previewX = initial.x + config.dragPreviewDeltaTicks.value;
    }

    if (isResizing && config.resizePreviewDeltaTicks.value !== null) {
      const initial = config.resizingState.value!.clipsInitialState.get(
        clip.id,
      )!;
      const delta = config.resizePreviewDeltaTicks.value;
      if (config.resizingState.value!.side === "right") {
        previewW = initial.w + delta;
      } else {
        previewX = initial.x + delta;
        previewW = initial.w - delta;
        previewStartOffset = initial.startOffset + delta;
      }
    }

    return {
      id: clip.id,
      x: clip.x,
      w: clip.w,
      startOffset: clip.startOffset,
      sampleDurationTicks: sample
        ? Math.ceil(sample.duration * ticksPerSecond(config.tempo()))
        : 0,
      waveformData: sample?.waveformData ?? null,
      color: config.trackColor(),
      name: sample?.name ?? "Loading...",
      isSelected: config.selectedClipIds.value.has(clip.id),
      isDragging,
      isResizing,
      previewX,
      previewW,
      previewStartOffset,
    };
  };

  const applyCanvasSize = (canvas: HTMLCanvasElement) => {
    dpr = window.devicePixelRatio || 1;

    const width = config.viewportWidth();
    const height = config.rowHeight();
    containerSize.value = { width, height };

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const deviceWidth = width * dpr;
    const deviceHeight = height * dpr;
    if (deviceWidth !== lastDeviceWidth || deviceHeight !== lastDeviceHeight) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
      lastDeviceWidth = deviceWidth;
      lastDeviceHeight = deviceHeight;
    }

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { ctx, width, height };
  };

  const initCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const { ctx, width, height } = applyCanvasSize(canvas);
    renderer.value = new AudioClipRenderer(
      ctx,
      rendererConfig(),
      width,
      height,
    );

    render();
  };

  const updateCanvasSize = () => {
    const canvas = canvasRef.value;
    if (!canvas || !renderer.value) return;

    const { width, height } = applyCanvasSize(canvas);
    renderer.value.updateConfig(rendererConfig(), width, height);

    render();
  };

  const buildSelectionRectData = (sr: SelectionRect | null) => {
    if (!sr) return null;
    return {
      x: Math.min(sr.startX, sr.currentX),
      y: Math.min(sr.startY, sr.currentY),
      w: Math.abs(sr.currentX - sr.startX),
      h: Math.abs(sr.currentY - sr.startY),
    };
  };

  const render = () => {
    if (!renderer.value) return;

    const clipData = config.clips().map(buildClipRenderData);

    renderer.value.render(
      clipData,
      buildSelectionRectData(config.selectionRect.value),
      config.playbackPosition(),
      config.isPlaying(),
      config.scrollLeft(),
    );
  };

  const scheduleRender = useRafSchedule(render);

  // Le chargement des waveforms est asynchrone (audioLibraryStore.loadSample) :
  // on dépend explicitement de samples.get(sampleId).waveformData pour chaque
  // clip visible, sinon l'arrivée tardive d'une waveform décodée après le
  // premier rendu ne déclenche aucun redraw.
  watch(
    [
      () => config.clips(),
      () =>
        config
          .clips()
          .map((c) => audioLibraryStore.samples.get(c.sampleId)?.waveformData),
      config.selectedClipIds,
      config.dragState,
      config.dragPreviewDeltaTicks,
      config.resizingState,
      config.resizePreviewDeltaTicks,
      config.selectionRect,
      () => config.playbackPosition(),
      () => config.isPlaying(),
    ],
    scheduleRender,
    { deep: true },
  );
  // scrollLeft est un nombre : watch séparé (sans deep) pour ne pas traverser
  // clips/waveformData à chaque tick de scroll simplement pour détecter ce
  // scalaire.
  watch(() => config.scrollLeft(), scheduleRender);

  const scheduleResize = useRafSchedule(updateCanvasSize);

  watch(
    [
      () => config.cols(),
      () => config.colWidth(),
      () => config.rowHeight(),
      () => config.timeSignature(),
      () => config.subdivision(),
    ],
    scheduleResize,
    { deep: true },
  );
  watch(() => config.viewportWidth(), scheduleResize);

  // Géométrie minimale (pas de lookup sample/waveform) : le hit-testing
  // n'utilise que id/x/w (voir getClipAtPosition/isOnResizeHandle dans
  // audioClipRenderer.ts), et tourne sur CHAQUE mousemove tant que la souris
  // survole la piste (curseur grab/ew-resize dynamique) — reconstruire les
  // waveforms à cette fréquence serait inutilement coûteux, contrairement au
  // render() throttlé par rAF.
  const buildHitTestData = (clip: AudioClip): ClipRenderData => ({
    id: clip.id,
    x: clip.x,
    w: clip.w,
    startOffset: clip.startOffset,
    sampleDurationTicks: 0,
    waveformData: null,
    color: "",
    name: "",
    isSelected: false,
    isDragging: false,
    isResizing: false,
  });

  const getClipAtPosition = (
    worldX: number,
    worldY: number,
  ): AudioClip | null => {
    if (!renderer.value) return null;

    const clipData = config.clips().map(buildHitTestData);
    const found = renderer.value.getClipAtPosition(worldX, worldY, clipData);
    if (!found) return null;

    return config.clips().find((c) => c.id === found.id) ?? null;
  };

  const isOnResizeHandle = (
    worldX: number,
    clip: AudioClip,
  ): "left" | "right" | null => {
    if (!renderer.value) return null;
    return renderer.value.isOnResizeHandle(worldX, buildHitTestData(clip));
  };

  return {
    initCanvas,
    render,
    scheduleRender,
    getClipAtPosition,
    isOnResizeHandle,
    containerSize,
  };
}
