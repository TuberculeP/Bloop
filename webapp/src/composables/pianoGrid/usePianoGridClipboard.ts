import { ref, type Ref } from "vue";
import { nextTick } from "vue";
import type { MidiNote } from "../../lib/utils/types";
import { TOTAL_NOTES } from "../../lib/audio/pianoRollConstants";

export interface ClipboardNote {
  dx: number;
  dy: number;
  w: number;
}

export function usePianoGridClipboard(
  notes: () => MidiNote[],
  selectedNotes: Ref<Set<string>>,
  cols: () => number,
  mouseGridPos: Ref<{ col: number; row: number }>,
  onPaste: (notes: Array<{ x: number; y: number; w: number }>) => void,
  snapStep: () => number = () => 1,
) {
  const clipboard = ref<ClipboardNote[]>([]);

  const copySelectedNotes = () => {
    if (selectedNotes.value.size === 0) return;

    const selected = notes().filter((n) => selectedNotes.value.has(n.i));
    if (selected.length === 0) return;

    let anchorX = Infinity;
    let anchorY = -Infinity;
    for (const note of selected) {
      if (note.x < anchorX || (note.x === anchorX && note.y > anchorY)) {
        anchorX = note.x;
        anchorY = note.y;
      }
    }

    clipboard.value = selected.map((note) => ({
      dx: note.x - anchorX,
      dy: note.y - anchorY,
      w: note.w,
    }));
  };

  const pasteNotes = async () => {
    if (clipboard.value.length === 0) return;

    const step = snapStep();
    const snappedCol = Math.round(mouseGridPos.value.col / step) * step;
    const baseX = snappedCol + step;
    const baseY = mouseGridPos.value.row;

    const notesToPaste: Array<{ x: number; y: number; w: number }> = [];
    for (const clipNote of clipboard.value) {
      const x = baseX + clipNote.dx;
      const y = baseY + clipNote.dy;

      if (x < 0 || x + clipNote.w > cols()) continue;
      if (y < 0 || y >= TOTAL_NOTES) continue;

      notesToPaste.push({ x, y, w: clipNote.w });
    }

    if (notesToPaste.length > 0) {
      onPaste(notesToPaste);

      await nextTick();
      selectedNotes.value.clear();
      for (const pasted of notesToPaste) {
        const match = notes().find(
          (n) => n.x === pasted.x && n.y === pasted.y && n.w === pasted.w,
        );
        if (match) {
          selectedNotes.value.add(match.i);
        }
      }
    }
  };

  const duplicateSelectedNotes = async () => {
    if (selectedNotes.value.size === 0) return;

    const selected = notes().filter((n) => selectedNotes.value.has(n.i));
    if (selected.length === 0) return;

    let rightmostEdge = 0;
    let minX = Infinity;
    for (const note of selected) {
      rightmostEdge = Math.max(rightmostEdge, note.x + note.w);
      minX = Math.min(minX, note.x);
    }

    const offsetX = rightmostEdge - minX;

    const notesToPaste: Array<{ x: number; y: number; w: number }> = [];
    for (const note of selected) {
      const x = note.x + offsetX;
      if (x + note.w > cols()) continue;
      notesToPaste.push({ x, y: note.y, w: note.w });
    }

    if (notesToPaste.length > 0) {
      onPaste(notesToPaste);

      await nextTick();
      selectedNotes.value.clear();
      for (const pasted of notesToPaste) {
        const match = notes().find(
          (n) => n.x === pasted.x && n.y === pasted.y && n.w === pasted.w,
        );
        if (match) {
          selectedNotes.value.add(match.i);
        }
      }
    }
  };

  return {
    clipboard,
    copySelectedNotes,
    pasteNotes,
    duplicateSelectedNotes,
  };
}
