import { ref, computed, type Ref } from "vue";
import type { AudioClip } from "../../lib/utils/types";
import { snapToGrid } from "../../lib/audio/timeGrid";

export interface AudioClipResizingState {
  side: "left" | "right";
  startMouseX: number;
  clickedClipId: string;
  clipsInitialState: Map<string, { x: number; w: number; startOffset: number }>;
}

export function useAudioClipResize(
  clips: () => AudioClip[],
  selectedClipIds: Ref<Set<string>>,
  colWidth: () => number,
  subdivision: () => number,
  onResizeEnd: (
    updates: Array<{
      clipId: string;
      x: number;
      w: number;
      startOffset: number;
    }>,
  ) => void,
  onInteractionEnd: () => void,
) {
  const resizingState = ref<AudioClipResizingState | null>(null);
  const resizePreviewDeltaTicks = ref<number | null>(null);

  const isResizing = computed(() => resizingState.value !== null);

  const handleResizeStart = (
    side: "left" | "right",
    event: MouseEvent,
    clip: AudioClip,
  ): void => {
    const clipsInitialState = new Map<
      string,
      { x: number; w: number; startOffset: number }
    >();

    if (selectedClipIds.value.has(clip.id)) {
      for (const c of clips()) {
        if (selectedClipIds.value.has(c.id)) {
          clipsInitialState.set(c.id, {
            x: c.x,
            w: c.w,
            startOffset: c.startOffset,
          });
        }
      }
    } else {
      clipsInitialState.set(clip.id, {
        x: clip.x,
        w: clip.w,
        startOffset: clip.startOffset,
      });
    }

    resizingState.value = {
      side,
      startMouseX: event.clientX,
      clickedClipId: clip.id,
      clipsInitialState,
    };
    resizePreviewDeltaTicks.value = 0;

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (event: MouseEvent): void => {
    if (!resizingState.value) return;

    const { side, clickedClipId, clipsInitialState } = resizingState.value;
    const deltaX = event.clientX - resizingState.value.startMouseX;
    const rawDeltaTicks = deltaX / colWidth();

    // Snap la position ABSOLUE du bord déplacé du clip cliqué (référence du
    // groupe), pas le delta brut : même principe que l'ancien
    // AudioClipItem.vue. Le delta qui en résulte est ensuite appliqué à tout
    // le groupe, chaque clip étant clampé individuellement ci-dessous. Le
    // bord qui bouge est le droit (x+w) en resize droit, le gauche (x) en
    // resize gauche.
    const clicked = clipsInitialState.get(clickedClipId)!;
    const movingEdge = side === "right" ? clicked.x + clicked.w : clicked.x;
    const snappedEdge = snapToGrid(movingEdge + rawDeltaTicks, subdivision());
    let delta = snappedEdge - movingEdge;

    let minDelta = -Infinity;
    let maxDelta = Infinity;

    if (side === "right") {
      // largeur finale = w + delta >= 1
      for (const [, info] of clipsInitialState) {
        minDelta = Math.max(minDelta, 1 - info.w);
      }
    } else {
      // x final = x + delta >= 0 ; startOffset final = startOffset + delta >= 0 ;
      // largeur finale = w - delta >= 1
      for (const [, info] of clipsInitialState) {
        minDelta = Math.max(minDelta, -info.x, -info.startOffset);
        maxDelta = Math.min(maxDelta, info.w - 1);
      }
    }

    resizePreviewDeltaTicks.value = Math.max(
      minDelta,
      Math.min(maxDelta, delta),
    );
  };

  const handleResizeEnd = (): void => {
    if (resizingState.value && resizePreviewDeltaTicks.value !== null) {
      const delta = resizePreviewDeltaTicks.value;
      const { side, clipsInitialState } = resizingState.value;
      if (delta !== 0) {
        // Resize droit : seule la largeur bouge. Resize gauche : x et
        // startOffset bougent du même delta que le bord déplacé, largeur
        // inversement (le bord droit reste fixe).
        const xDelta = side === "left" ? delta : 0;
        const wDelta = side === "left" ? -delta : delta;
        const startOffsetDelta = side === "left" ? delta : 0;

        const updates = Array.from(clipsInitialState, ([clipId, info]) => ({
          clipId,
          x: info.x + xDelta,
          w: info.w + wDelta,
          startOffset: info.startOffset + startOffsetDelta,
        }));
        onResizeEnd(updates);
      }
      onInteractionEnd();
    }
    resizingState.value = null;
    resizePreviewDeltaTicks.value = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  const cleanup = (): void => {
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  return {
    resizingState,
    resizePreviewDeltaTicks,
    isResizing,
    handleResizeStart,
    cleanup,
  };
}
