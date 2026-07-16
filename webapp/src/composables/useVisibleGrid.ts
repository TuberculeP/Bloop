import { computed } from "vue";
import { useTimelineStore } from "../stores/timelineStore";
import {
  ticksPerBar,
  getVisibleTickRange,
  getVisibleMeasureRange,
  getVisibleSubdivisionTicks,
} from "../lib/audio/timeGrid";

// Calcul partagé des ticks/mesures/subdivisions visibles à l'écran, utilisé
// par le ruler et les pistes de clips audio pour rester alignés sur les
// mêmes traits (voir TimelineRuler.vue / AudioClipRow.vue).
export function useVisibleGrid(
  scrollLeft: () => number,
  viewportWidth: () => number,
  colWidth: () => number,
  cols: () => number,
) {
  const timelineStore = useTimelineStore();

  const barLength = computed(() => ticksPerBar(timelineStore.timeSignature));

  const visibleTickRange = computed(() =>
    getVisibleTickRange(scrollLeft(), viewportWidth(), colWidth(), cols()),
  );

  const visibleMeasureRange = computed(() => {
    const [tickStart, tickEnd] = visibleTickRange.value;
    return getVisibleMeasureRange(tickStart, tickEnd, barLength.value, cols());
  });

  const visibleSubdivisionTicks = computed(() => {
    const [tickStart, tickEnd] = visibleTickRange.value;
    return getVisibleSubdivisionTicks(
      tickStart,
      tickEnd,
      timelineStore.subdivision,
      barLength.value,
    );
  });

  return {
    barLength,
    visibleTickRange,
    visibleMeasureRange,
    visibleSubdivisionTicks,
  };
}
