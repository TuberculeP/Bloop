import { ref, watch, type Ref } from "vue";
import type { MidiNote, NoteName } from "../../lib/utils/types";
import {
  TOTAL_NOTES,
  NOTE_ROW_HEIGHT,
  noteIndexToName,
} from "../../lib/audio/pianoRollConstants";
import {
  PianoGridRenderer,
  type NoteRenderData,
  type SelectionRectData,
} from "../../lib/canvas/pianoGridRenderer";

interface DragState {
  notesInitialPos: Map<string, { x: number; y: number }>;
}

interface ResizingState {
  notesInitialWidth: Map<string, { width: number }>;
}

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface UsePianoGridCanvasConfig {
  cols: () => number;
  colWidth: () => number;
  notes: () => MidiNote[];
  trackColor: () => string;
  activeNotes: () => Set<NoteName>;
  selectedNotes: Ref<Set<string>>;
  dragState: Ref<DragState | null>;
  dragPreviewDeltas: Ref<{ dx: number; dy: number } | null>;
  resizingState: Ref<ResizingState | null>;
  resizePreviewDelta: Ref<number | null>;
  selectionRect: Ref<SelectionRect | null>;
}

export function usePianoGridCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  config: UsePianoGridCanvasConfig,
) {
  const renderer = ref<PianoGridRenderer | null>(null);
  let renderScheduled = false;
  let dpr = 1;

  const initCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    dpr = window.devicePixelRatio || 1;

    const width = config.cols() * config.colWidth();
    const height = TOTAL_NOTES * NOTE_ROW_HEIGHT;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    renderer.value = new PianoGridRenderer(
      ctx,
      {
        cols: config.cols(),
        colWidth: config.colWidth(),
        trackColor: config.trackColor(),
      },
      width,
      height,
    );

    render();
  };

  const updateCanvasSize = () => {
    const canvas = canvasRef.value;
    if (!canvas || !renderer.value) return;

    const width = config.cols() * config.colWidth();
    const height = TOTAL_NOTES * NOTE_ROW_HEIGHT;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    renderer.value.updateConfig(
      {
        cols: config.cols(),
        colWidth: config.colWidth(),
        trackColor: config.trackColor(),
      },
      width,
      height,
    );

    render();
  };

  const scheduleRender = () => {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      render();
      renderScheduled = false;
    });
  };

  const render = () => {
    if (!renderer.value) return;

    const noteData: NoteRenderData[] = config.notes().map((note) => {
      const isDragging =
        config.dragState.value?.notesInitialPos.has(note.i) ?? false;
      const isResizing =
        config.resizingState.value?.notesInitialWidth.has(note.i) ?? false;

      let previewX: number | undefined;
      let previewY: number | undefined;
      let previewW: number | undefined;

      if (isDragging && config.dragPreviewDeltas.value) {
        const initial = config.dragState.value!.notesInitialPos.get(note.i)!;
        previewX = initial.x + config.dragPreviewDeltas.value.dx;
        previewY = initial.y + config.dragPreviewDeltas.value.dy;
      }

      if (isResizing && config.resizePreviewDelta.value !== null) {
        const initial = config.resizingState.value!.notesInitialWidth.get(
          note.i,
        )!;
        previewW = initial.width + config.resizePreviewDelta.value;
      }

      return {
        id: note.i,
        x: note.x,
        y: note.y,
        w: note.w,
        isSelected: config.selectedNotes.value.has(note.i),
        isDragging,
        isResizing,
        previewX,
        previewY,
        previewW,
      };
    });

    const activeRows = new Set<number>();
    for (let i = 0; i < TOTAL_NOTES; i++) {
      if (config.activeNotes().has(noteIndexToName(i))) {
        activeRows.add(i);
      }
    }

    let selRect: SelectionRectData | null = null;
    if (config.selectionRect.value) {
      const sr = config.selectionRect.value;
      selRect = {
        x: Math.min(sr.startX, sr.currentX),
        y: Math.min(sr.startY, sr.currentY),
        w: Math.abs(sr.currentX - sr.startX),
        h: Math.abs(sr.currentY - sr.startY),
      };
    }

    renderer.value.render(noteData, activeRows, selRect);
  };

  watch(
    [
      () => config.notes(),
      () => config.activeNotes(),
      config.selectedNotes,
      config.dragState,
      config.dragPreviewDeltas,
      config.resizingState,
      config.resizePreviewDelta,
      config.selectionRect,
    ],
    scheduleRender,
    { deep: true },
  );

  watch([() => config.cols(), () => config.colWidth()], updateCanvasSize);

  const getNoteAtPosition = (x: number, y: number): MidiNote | null => {
    if (!renderer.value) return null;

    const noteData: NoteRenderData[] = config.notes().map((note) => ({
      id: note.i,
      x: note.x,
      y: note.y,
      w: note.w,
      isSelected: false,
      isDragging: false,
      isResizing: false,
    }));

    const found = renderer.value.getNoteAtPosition(x, y, noteData);
    if (!found) return null;

    return config.notes().find((n) => n.i === found.id) ?? null;
  };

  const isOnResizeHandle = (x: number, note: MidiNote): boolean => {
    if (!renderer.value) return false;

    const noteData: NoteRenderData = {
      id: note.i,
      x: note.x,
      y: note.y,
      w: note.w,
      isSelected: false,
      isDragging: false,
      isResizing: false,
    };

    return renderer.value.isOnResizeHandle(x, noteData);
  };

  return {
    initCanvas,
    render,
    scheduleRender,
    getNoteAtPosition,
    isOnResizeHandle,
  };
}
