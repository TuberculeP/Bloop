import { ref, onMounted, onBeforeUnmount, type Ref } from "vue";
import type { AutomationLane, AutomationPoint } from "../lib/utils/types";
import { useTimelineStore } from "../stores/timelineStore";
import type { AutomationLaneRenderer } from "../lib/canvas/automationLaneRenderer";

const DRAG_THRESHOLD = 4;
const DUPLICATE_OFFSET = 4;
const MAX_UNDO = 50;

export function useAutomationLane(
  trackId: string,
  lane: AutomationLane,
  rendererRef: Ref<AutomationLaneRenderer | null>,
  scrollLeft: () => number,
  cols: () => number,
) {
  const timelineStore = useTimelineStore();

  const hoveredPointId = ref<string | null>(null);
  const selectedPointIds = ref<Set<string>>(new Set());
  const marqueeRect = ref<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  let canvas: HTMLCanvasElement | null = null;

  const undoStack: AutomationPoint[][] = [];
  const redoStack: AutomationPoint[][] = [];

  const pushSnapshot = () => {
    undoStack.push(lane.points.map((p) => ({ ...p })));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  };

  const undo = () => {
    const snapshot = undoStack.pop();
    if (!snapshot) return;
    redoStack.push(lane.points.map((p) => ({ ...p })));
    timelineStore.setAutomationPoints(trackId, lane.id, snapshot);
    selectedPointIds.value = new Set();
  };

  const redo = () => {
    const snapshot = redoStack.pop();
    if (!snapshot) return;
    undoStack.push(lane.points.map((p) => ({ ...p })));
    timelineStore.setAutomationPoints(trackId, lane.id, snapshot);
    selectedPointIds.value = new Set();
  };

  interface PendingDrag {
    pointId: string | null;
    startCanvasX: number;
    startCanvasY: number;
    isMarquee: boolean;
    // group drag: initial positions + start grid coords
    groupInitial: Map<string, { x: number; y: number }> | null;
    startGridX: number;
    startGridY: number;
    snapshotPushed: boolean;
  }

  let pendingDrag: PendingDrag | null = null;
  let isDragging = false;

  const setCanvas = (el: HTMLCanvasElement) => {
    canvas = el;
  };

  const getCanvasCoords = (
    event: MouseEvent,
  ): { x: number; y: number } | null => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleMouseMove = (event: MouseEvent): void => {
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);
    if (!coords || !renderer) return;

    if (pendingDrag) {
      const dx = coords.x - pendingDrag.startCanvasX;
      const dy = coords.y - pendingDrag.startCanvasY;

      if (!isDragging && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      isDragging = true;

      if (pendingDrag.isMarquee) {
        marqueeRect.value = {
          startX: pendingDrag.startCanvasX,
          startY: pendingDrag.startCanvasY,
          currentX: coords.x,
          currentY: coords.y,
        };
        return;
      }

      if (pendingDrag.groupInitial) {
        if (!pendingDrag.snapshotPushed) {
          pushSnapshot();
          pendingDrag.snapshotPushed = true;
        }

        const cur = renderer.canvasToPoint(coords.x, coords.y, scrollLeft());
        const deltaX = cur.x - pendingDrag.startGridX;
        const deltaY = cur.y - pendingDrag.startGridY;

        for (const [pid, initial] of pendingDrag.groupInitial) {
          timelineStore.updateAutomationPoint(trackId, lane.id, pid, {
            x: Math.max(0, Math.round(initial.x + deltaX)),
            y: Math.max(0, Math.min(1, initial.y + deltaY)),
          });
        }
        return;
      }
    }

    const hit = renderer.getPointAtPosition(coords.x, coords.y, lane.points);
    hoveredPointId.value = hit?.id ?? null;
  };

  const handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);
    if (!coords || !renderer) return;

    const isCtrl = event.ctrlKey || event.metaKey;
    const hit = renderer.getPointAtPosition(coords.x, coords.y, lane.points);

    if (hit) {
      if (isCtrl) {
        const next = new Set(selectedPointIds.value);
        if (next.has(hit.id)) next.delete(hit.id);
        else next.add(hit.id);
        selectedPointIds.value = next;
        return;
      }

      if (!selectedPointIds.value.has(hit.id)) {
        selectedPointIds.value = new Set([hit.id]);
      }

      const startGrid = renderer.canvasToPoint(
        coords.x,
        coords.y,
        scrollLeft(),
      );
      const groupInitial = new Map<string, { x: number; y: number }>();
      for (const pid of selectedPointIds.value) {
        const p = lane.points.find((pt) => pt.id === pid);
        if (p) groupInitial.set(pid, { x: p.x, y: p.y });
      }

      pendingDrag = {
        pointId: hit.id,
        startCanvasX: coords.x,
        startCanvasY: coords.y,
        isMarquee: false,
        groupInitial,
        startGridX: startGrid.x,
        startGridY: startGrid.y,
        snapshotPushed: false,
      };
      isDragging = false;
      return;
    }

    if (isCtrl) {
      pendingDrag = {
        pointId: null,
        startCanvasX: coords.x,
        startCanvasY: coords.y,
        isMarquee: true,
        groupInitial: null,
        startGridX: 0,
        startGridY: 0,
        snapshotPushed: false,
      };
      isDragging = false;
      return;
    }

    pendingDrag = {
      pointId: null,
      startCanvasX: coords.x,
      startCanvasY: coords.y,
      isMarquee: false,
      groupInitial: null,
      startGridX: 0,
      startGridY: 0,
      snapshotPushed: false,
    };
    isDragging = false;
  };

  const handleMouseUp = (event: MouseEvent): void => {
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);

    if (pendingDrag && !isDragging && coords && renderer) {
      if (!pendingDrag.isMarquee && pendingDrag.pointId === null) {
        pushSnapshot();
        const { x, y } = renderer.canvasToPoint(
          coords.x,
          coords.y,
          scrollLeft(),
        );
        const pointId = timelineStore.addAutomationPoint(trackId, lane.id, {
          x: Math.max(0, Math.round(x)),
          y,
        });
        if (pointId) selectedPointIds.value = new Set([pointId]);
      }
    }

    if (pendingDrag?.isMarquee && marqueeRect.value && renderer) {
      const rect = marqueeRect.value;
      const minX = Math.min(rect.startX, rect.currentX);
      const maxX = Math.max(rect.startX, rect.currentX);
      const minY = Math.min(rect.startY, rect.currentY);
      const maxY = Math.max(rect.startY, rect.currentY);
      const hits = renderer.getPointsInRect(
        minX,
        maxX,
        minY,
        maxY,
        lane.points,
      );
      selectedPointIds.value = new Set(hits.map((p) => p.id));
      marqueeRect.value = null;
    }

    pendingDrag = null;
    isDragging = false;
  };

  const handleDblClick = (event: MouseEvent): void => {
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);
    if (!coords || !renderer) return;

    const hit = renderer.getPointAtPosition(coords.x, coords.y, lane.points);
    if (hit) {
      pushSnapshot();
      timelineStore.removeAutomationPoint(trackId, lane.id, hit.id);
      selectedPointIds.value.delete(hit.id);
      if (hoveredPointId.value === hit.id) hoveredPointId.value = null;
    }
  };

  const handleMouseLeave = (): void => {
    hoveredPointId.value = null;
    if (!isDragging) {
      pendingDrag = null;
      marqueeRect.value = null;
    }
  };

  const deleteSelected = () => {
    if (selectedPointIds.value.size === 0) return;
    pushSnapshot();
    for (const pid of [...selectedPointIds.value]) {
      timelineStore.removeAutomationPoint(trackId, lane.id, pid);
    }
    selectedPointIds.value = new Set();
  };

  const duplicateSelected = () => {
    if (selectedPointIds.value.size === 0) return;
    const maxCols = cols();
    const toDuplicate = lane.points.filter((p) =>
      selectedPointIds.value.has(p.id),
    );
    if (toDuplicate.length === 0) return;

    pushSnapshot();
    const newIds: string[] = [];
    for (const p of toDuplicate) {
      const newX = p.x + DUPLICATE_OFFSET;
      if (newX >= maxCols) continue;
      const id = timelineStore.addAutomationPoint(trackId, lane.id, {
        x: newX,
        y: p.y,
      });
      if (id) newIds.push(id);
    }
    selectedPointIds.value = new Set(newIds);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const isCtrl = event.ctrlKey || event.metaKey;

    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      selectedPointIds.value.size > 0
    ) {
      event.preventDefault();
      deleteSelected();
      return;
    }

    if (isCtrl && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
      return;
    }

    if (
      isCtrl &&
      ((event.key === "z" && event.shiftKey) || event.key === "y")
    ) {
      event.preventDefault();
      redo();
      return;
    }

    if (isCtrl && event.key === "d") {
      event.preventDefault();
      duplicateSelected();
      return;
    }

    if (event.key === "Escape") {
      selectedPointIds.value = new Set();
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
  });

  return {
    hoveredPointId,
    selectedPointIds,
    marqueeRect,
    setCanvas,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleDblClick,
    handleMouseLeave,
  };
}
