import { ref, watch, type Ref } from "vue";
import type {
  AudioClip,
  ClipResizeMode,
  TimeSignature,
} from "../../lib/utils/types";
import { getVisibleTickRange } from "../../lib/audio/timeGrid";
import {
  computeClipPlaybackParams,
  applyResizeStretch,
} from "../../lib/audio/clipStretch";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import { useStretchRenderCacheStore } from "../../stores/stretchRenderCacheStore";
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
  clipResizeMode: () => ClipResizeMode;
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
  const stretchRenderCacheStore = useStretchRenderCacheStore();
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
    // Clip "effectif" pour le calcul de la waveform : identique à `clip` sauf
    // pendant un resize en cours, où il simule le résultat d'un
    // applyResizeStretch sur les valeurs d'aperçu — pour que la waveform
    // reflète immédiatement le stretch pendant le drag, pas seulement une
    // fois le resize relâché.
    let waveformClip: AudioClip = clip;

    if (isDragging && config.dragPreviewDeltaTicks.value !== null) {
      const initial = config.dragState.value!.clipsInitialPos.get(clip.id)!;
      previewX = initial.x + config.dragPreviewDeltaTicks.value;
    }

    if (isResizing && config.resizePreviewDeltaTicks.value !== null) {
      const initial = config.resizingState.value!.clipsInitialState.get(
        clip.id,
      )!;
      const delta = config.resizePreviewDeltaTicks.value;
      let previewStartOffset = initial.startOffset;
      if (config.resizingState.value!.side === "right") {
        previewW = initial.w + delta;
      } else {
        previewX = initial.x + delta;
        previewW = initial.w - delta;
        previewStartOffset = initial.startOffset + delta;
      }
      waveformClip = {
        ...clip,
        ...applyResizeStretch(
          clip,
          {
            x: previewX ?? initial.x,
            w: previewW,
            startOffset: previewStartOffset,
          },
          config.clipResizeMode(),
          config.tempo(),
        ),
      };
    }

    const waveformParams = computeClipPlaybackParams(
      waveformClip,
      config.tempo(),
    );

    // Un clip en cours de re-rendu (BPM/tune changé, cache pas encore chaud)
    // affiche le même placeholder qu'une waveform pas encore chargée — le
    // rendu stretché en cache pourrait être obsolète le temps du recalcul.
    const isReprocessing = stretchRenderCacheStore.pendingClipIds.has(clip.id);

    return {
      id: clip.id,
      x: clip.x,
      w: clip.w,
      waveformOffsetSeconds: waveformParams.offsetSeconds,
      waveformDurationSeconds: waveformParams.durationSeconds,
      sampleDurationSeconds: sample?.duration ?? 0,
      waveformData: isReprocessing ? null : (sample?.waveformData ?? null),
      color: config.trackColor(),
      name: sample?.name ?? "Loading...",
      isSelected: config.selectedClipIds.value.has(clip.id),
      isDragging,
      isResizing,
      previewX,
      previewW,
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

    // Filtre par plage de ticks visible AVANT de construire les données de
    // rendu (lookup sample + calcul de durée par clip) : sans ça, une piste
    // chargée redéciderait ce travail pour des clips hors-écran à chaque
    // redraw, alors que le renderer les aurait de toute façon exclus après
    // coup (culling interne).
    const [tickStart, tickEnd] = getVisibleTickRange(
      config.scrollLeft(),
      config.viewportWidth(),
      config.colWidth(),
      config.cols(),
    );
    const visibleClips = config
      .clips()
      .filter((c) => c.x < tickEnd && c.x + c.w > tickStart);
    const clipData = visibleClips.map(buildClipRenderData);

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
  // premier rendu ne déclenche aucun redraw. Regroupé avec les autres sources
  // qui ont besoin d'un vrai deep watch (Set/Map mutés en place :
  // selectedClipIds, dragState, resizingState, pendingClipIds) — ces
  // collections restent petites (quelques clips), le traversal reste bon
  // marché. `tempo()` est ici aussi : le découpage de la waveform en dépend
  // (cf. computeClipPlaybackParams, y compris pour un clip non stretché) —
  // sans lui, un changement de BPM laissait la waveform visuellement figée
  // sur l'ancienne tempo jusqu'à un redraw déclenché par autre chose.
  watch(
    [
      () => config.clips(),
      () =>
        config
          .clips()
          .map((c) => audioLibraryStore.samples.get(c.sampleId)?.waveformData),
      () => config.tempo(),
      config.selectedClipIds,
      config.dragState,
      config.resizingState,
      config.selectionRect,
      () => stretchRenderCacheStore.pendingClipIds,
    ],
    scheduleRender,
    { deep: true },
  );
  // dragPreviewDeltaTicks/resizePreviewDeltaTicks changent à chaque mousemove
  // brut pendant un drag/resize (non throttled) : les isoler du deep watch
  // ci-dessus évite de re-traverser les tableaux waveformData (1000 points
  // par sample) à cette fréquence pour de simples scalaires. scrollLeft reste
  // séparé pour la même raison (scroll à haute fréquence).
  watch(
    [
      config.dragPreviewDeltaTicks,
      config.resizePreviewDeltaTicks,
      () => config.playbackPosition(),
      () => config.isPlaying(),
    ],
    scheduleRender,
  );
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

  // Le hit-testing tourne sur CHAQUE mousemove tant que la souris survole la
  // piste (curseur grab/ew-resize dynamique), contrairement au render()
  // throttlé par rAF : un AudioClip brut (id/x/w) satisfait déjà la géométrie
  // minimale attendue par le renderer (voir ClipHitTestData), donc on le lui
  // passe directement sans construire de wrapper à cette fréquence.
  const getClipAtPosition = (
    worldX: number,
    worldY: number,
  ): AudioClip | null => {
    if (!renderer.value) return null;
    return renderer.value.getClipAtPosition(worldX, worldY, config.clips());
  };

  const isOnResizeHandle = (
    worldX: number,
    clip: AudioClip,
  ): "left" | "right" | null => {
    if (!renderer.value) return null;
    return renderer.value.isOnResizeHandle(worldX, clip);
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
