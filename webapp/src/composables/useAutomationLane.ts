import { ref, type Ref } from "vue";
import type { AutomationLane } from "../lib/utils/types";
import { useTimelineStore } from "../stores/timelineStore";
import type { AutomationLaneRenderer } from "../lib/canvas/automationLaneRenderer";

export function useAutomationLane(
  trackId: string,
  lane: AutomationLane,
  rendererRef: Ref<AutomationLaneRenderer | null>,
  scrollLeft: () => number,
) {
  const timelineStore = useTimelineStore();

  const hoveredPointId = ref<string | null>(null);
  const selectedPointId = ref<string | null>(null);

  let dragging: { pointId: string } | null = null;
  let canvas: HTMLCanvasElement | null = null;

  const setCanvas = (el: HTMLCanvasElement) => {
    canvas = el;
  };

  const getCanvasCoords = (
    event: MouseEvent,
  ): { x: number; y: number } | null => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleMouseMove = (event: MouseEvent): void => {
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);
    if (!coords || !renderer) return;

    if (dragging) {
      const { x, y } = renderer.canvasToPoint(coords.x, coords.y, scrollLeft());
      timelineStore.updateAutomationPoint(trackId, lane.id, dragging.pointId, {
        x: Math.max(0, Math.round(x)),
        y,
      });
      return;
    }

    const hit = renderer.getPointAtPosition(coords.x, coords.y, lane.points);
    hoveredPointId.value = hit?.id ?? null;
  };

  const handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);
    if (!coords || !renderer) return;

    const hit = renderer.getPointAtPosition(coords.x, coords.y, lane.points);

    if (hit) {
      dragging = { pointId: hit.id };
      selectedPointId.value = hit.id;
      return;
    }

    const { x, y } = renderer.canvasToPoint(coords.x, coords.y, scrollLeft());
    const pointId = timelineStore.addAutomationPoint(trackId, lane.id, {
      x: Math.max(0, Math.round(x)),
      y,
    });
    if (pointId) {
      selectedPointId.value = pointId;
      dragging = { pointId };
    }
  };

  const handleMouseUp = (): void => {
    dragging = null;
  };

  const handleDblClick = (event: MouseEvent): void => {
    const renderer = rendererRef.value;
    const coords = getCanvasCoords(event);
    if (!coords || !renderer) return;

    const hit = renderer.getPointAtPosition(coords.x, coords.y, lane.points);
    if (hit) {
      timelineStore.removeAutomationPoint(trackId, lane.id, hit.id);
      if (selectedPointId.value === hit.id) selectedPointId.value = null;
      if (hoveredPointId.value === hit.id) hoveredPointId.value = null;
    }
  };

  const handleMouseLeave = (): void => {
    hoveredPointId.value = null;
    dragging = null;
  };

  return {
    hoveredPointId,
    selectedPointId,
    setCanvas,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleDblClick,
    handleMouseLeave,
  };
}
