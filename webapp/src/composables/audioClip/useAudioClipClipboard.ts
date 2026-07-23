import { ref, type Ref } from "vue";
import { nextTick } from "vue";
import type { AudioClip } from "../../lib/utils/types";

export interface ClipboardClip {
  dx: number;
  sampleId: string;
  w: number;
  startOffset: number;
  stretched?: boolean;
  stretchReferenceTicks?: number;
  stretchReferenceTempo?: number;
  semitones?: number;
  cents?: number;
}

export function useAudioClipClipboard(
  clips: () => AudioClip[],
  selectedClipIds: Ref<Set<string>>,
  cols: () => number,
  mouseGridCol: Ref<number>,
  onPaste: (clips: Array<Omit<AudioClip, "id">>) => void,
) {
  const clipboard = ref<ClipboardClip[]>([]);

  const copySelectedClips = () => {
    if (selectedClipIds.value.size === 0) return;

    const selected = clips().filter((c) => selectedClipIds.value.has(c.id));
    if (selected.length === 0) return;

    let anchorX = Infinity;
    for (const clip of selected) {
      if (clip.x < anchorX) {
        anchorX = clip.x;
      }
    }

    clipboard.value = selected.map((clip) => ({
      dx: clip.x - anchorX,
      sampleId: clip.sampleId,
      w: clip.w,
      startOffset: clip.startOffset,
      stretched: clip.stretched,
      stretchReferenceTicks: clip.stretchReferenceTicks,
      stretchReferenceTempo: clip.stretchReferenceTempo,
      semitones: clip.semitones,
      cents: clip.cents,
    }));
  };

  const pasteClips = async () => {
    if (clipboard.value.length === 0) return;

    const baseX = mouseGridCol.value;

    const clipsToPaste: Array<Omit<AudioClip, "id">> = [];
    for (const clipData of clipboard.value) {
      const x = baseX + clipData.dx;

      if (x < 0 || x + clipData.w > cols()) continue;

      clipsToPaste.push({
        sampleId: clipData.sampleId,
        x,
        w: clipData.w,
        startOffset: clipData.startOffset,
        stretched: clipData.stretched,
        stretchReferenceTicks: clipData.stretchReferenceTicks,
        stretchReferenceTempo: clipData.stretchReferenceTempo,
        semitones: clipData.semitones,
        cents: clipData.cents,
      });
    }

    if (clipsToPaste.length > 0) {
      onPaste(clipsToPaste);

      await nextTick();
      selectedClipIds.value.clear();
      for (const pasted of clipsToPaste) {
        const match = clips().find(
          (c) =>
            c.x === pasted.x &&
            c.sampleId === pasted.sampleId &&
            c.w === pasted.w,
        );
        if (match) {
          selectedClipIds.value.add(match.id);
        }
      }
    }
  };

  const duplicateSelectedClips = async () => {
    if (selectedClipIds.value.size === 0) return;

    const selected = clips().filter((c) => selectedClipIds.value.has(c.id));
    if (selected.length === 0) return;

    let rightmostEdge = 0;
    let minX = Infinity;
    for (const clip of selected) {
      rightmostEdge = Math.max(rightmostEdge, clip.x + clip.w);
      minX = Math.min(minX, clip.x);
    }

    const offsetX = rightmostEdge - minX;

    const clipsToPaste: Array<Omit<AudioClip, "id">> = [];
    for (const clip of selected) {
      const x = clip.x + offsetX;
      if (x + clip.w > cols()) continue;
      clipsToPaste.push({
        sampleId: clip.sampleId,
        x,
        w: clip.w,
        startOffset: clip.startOffset,
        stretched: clip.stretched,
        stretchReferenceTicks: clip.stretchReferenceTicks,
        stretchReferenceTempo: clip.stretchReferenceTempo,
        semitones: clip.semitones,
        cents: clip.cents,
      });
    }

    if (clipsToPaste.length > 0) {
      onPaste(clipsToPaste);

      await nextTick();
      selectedClipIds.value.clear();
      for (const pasted of clipsToPaste) {
        const match = clips().find(
          (c) =>
            c.x === pasted.x &&
            c.sampleId === pasted.sampleId &&
            c.w === pasted.w,
        );
        if (match) {
          selectedClipIds.value.add(match.id);
        }
      }
    }
  };

  return {
    clipboard,
    copySelectedClips,
    pasteClips,
    duplicateSelectedClips,
  };
}
