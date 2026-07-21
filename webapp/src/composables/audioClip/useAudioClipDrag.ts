import { ref, computed, type Ref } from "vue";
import type { AudioClip } from "../../lib/utils/types";
import { snapToGrid } from "../../lib/audio/timeGrid";

export interface AudioClipDragState {
  startMouseX: number;
  clickedClipId: string;
  hasMoved: boolean;
  clipsInitialPos: Map<string, { x: number }>;
}

export function useAudioClipDrag(
  clips: () => AudioClip[],
  selectedClipIds: Ref<Set<string>>,
  colWidth: () => number,
  subdivision: () => number,
  onDragEnd: (updates: Array<{ clipId: string; x: number }>) => void,
  onInteractionEnd: () => void,
) {
  const dragState = ref<AudioClipDragState | null>(null);
  const dragPreviewDeltaTicks = ref<number | null>(null);

  const isDragging = computed(() => dragState.value !== null);

  const handleDragStart = (event: MouseEvent, clip: AudioClip): void => {
    const wasSelected = selectedClipIds.value.has(clip.id);

    const clipsInitialPos = new Map<string, { x: number }>();
    if (wasSelected) {
      for (const c of clips()) {
        if (selectedClipIds.value.has(c.id)) {
          clipsInitialPos.set(c.id, { x: c.x });
        }
      }
    } else {
      clipsInitialPos.set(clip.id, { x: clip.x });
    }

    dragState.value = {
      startMouseX: event.clientX,
      clickedClipId: clip.id,
      hasMoved: false,
      clipsInitialPos,
    };
    dragPreviewDeltaTicks.value = 0;

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = (event: MouseEvent): void => {
    if (!dragState.value) return;

    const deltaX = event.clientX - dragState.value.startMouseX;
    const rawDeltaTicks = deltaX / colWidth();

    if (!dragState.value.hasMoved && rawDeltaTicks !== 0) {
      dragState.value.hasMoved = true;
    }

    // Snap la position ABSOLUE du clip cliqué (référence du groupe), pas le
    // delta brut : même principe que l'ancien AudioClipItem.vue, pour qu'un
    // clip déposé hors-grille se réaligne dès qu'on le déplace. Le delta qui
    // en résulte est ensuite appliqué à tout le groupe.
    const clicked = dragState.value.clipsInitialPos.get(
      dragState.value.clickedClipId,
    )!;
    const rawX = clicked.x + rawDeltaTicks;
    const snappedX = snapToGrid(rawX, subdivision());
    let delta = snappedX - clicked.x;

    // Clamp pour qu'aucun clip du groupe ne passe sous x=0.
    for (const [, pos] of dragState.value.clipsInitialPos) {
      delta = Math.max(delta, -pos.x);
    }

    dragPreviewDeltaTicks.value = delta;
  };

  const handleDragEnd = (): void => {
    if (dragState.value?.hasMoved && dragPreviewDeltaTicks.value !== null) {
      const delta = dragPreviewDeltaTicks.value;
      if (delta !== 0) {
        const updates: Array<{ clipId: string; x: number }> = [];
        for (const [clipId, pos] of dragState.value.clipsInitialPos) {
          updates.push({ clipId, x: pos.x + delta });
        }
        onDragEnd(updates);
      }
      onInteractionEnd();
    }
    dragState.value = null;
    dragPreviewDeltaTicks.value = null;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  const cleanup = (): void => {
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  return {
    dragState,
    dragPreviewDeltaTicks,
    isDragging,
    handleDragStart,
    cleanup,
  };
}
