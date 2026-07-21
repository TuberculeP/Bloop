import { ref, type Ref } from "vue";
import type { AudioClip } from "../../lib/utils/types";

export interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function useAudioClipSelection(
  containerRef: Ref<HTMLElement | null>,
  clips: () => AudioClip[],
  colWidth: () => number,
  gridWidth: () => number,
  gridHeight: () => number,
  scrollLeft: () => number = () => 0,
) {
  const selectedClipIds = ref<Set<string>>(new Set());
  const selectionRect = ref<SelectionRect | null>(null);
  const justFinishedSelecting = ref(false);

  // Le canvas ne couvre plus que le viewport visible (piste sticky, voir
  // AudioClipRow.vue) : les coordonnées canvas-local (via getBoundingClientRect)
  // sont recalées en coordonnées monde en ajoutant le scroll courant, comme
  // dans usePianoGridSelection.ts. Le rectangle de sélection est ainsi stocké
  // en coordonnées monde, dessiné par audioClipRenderer.ts via la même
  // translation globale (-scrollLeft) que le reste de la piste.
  const handleSelectionStart = (event: MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = scrollLeft() + (event.clientX - rect.left);
    const y = event.clientY - rect.top;
    selectionRect.value = { startX: x, startY: y, currentX: x, currentY: y };
    document.addEventListener("mousemove", handleSelectionMove);
    document.addEventListener("mouseup", handleSelectionEnd);
  };

  const handleSelectionMove = (event: MouseEvent) => {
    if (!selectionRect.value || !containerRef.value) return;
    const rect = containerRef.value.getBoundingClientRect();
    const worldX = scrollLeft() + (event.clientX - rect.left);
    const y = event.clientY - rect.top;
    const x = Math.max(0, Math.min(worldX, gridWidth()));
    selectionRect.value.currentX = x;
    selectionRect.value.currentY = Math.max(0, Math.min(y, gridHeight()));
  };

  const handleSelectionEnd = () => {
    if (selectionRect.value) {
      const { startX, currentX } = selectionRect.value;
      const left = Math.min(startX, currentX);
      const right = Math.max(startX, currentX);

      const colLeft = left / colWidth();
      const colRight = right / colWidth();

      for (const clip of clips()) {
        const clipLeft = clip.x;
        const clipRight = clip.x + clip.w;

        const overlaps = clipLeft < colRight && clipRight > colLeft;

        if (overlaps) {
          selectedClipIds.value.add(clip.id);
        }
      }
      justFinishedSelecting.value = true;
    }
    selectionRect.value = null;
    document.removeEventListener("mousemove", handleSelectionMove);
    document.removeEventListener("mouseup", handleSelectionEnd);
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", handleSelectionMove);
    document.removeEventListener("mouseup", handleSelectionEnd);
  };

  const selectClip = (clipId: string, event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      if (selectedClipIds.value.has(clipId)) {
        selectedClipIds.value.delete(clipId);
      } else {
        selectedClipIds.value.add(clipId);
      }
    } else if (!selectedClipIds.value.has(clipId)) {
      selectedClipIds.value.clear();
      selectedClipIds.value.add(clipId);
    }
  };

  const clearSelection = () => {
    selectedClipIds.value.clear();
  };

  const removeFromSelection = (clipId: string) => {
    selectedClipIds.value.delete(clipId);
  };

  return {
    selectedClipIds,
    selectionRect,
    justFinishedSelecting,
    handleSelectionStart,
    selectClip,
    clearSelection,
    removeFromSelection,
    cleanup,
  };
}
