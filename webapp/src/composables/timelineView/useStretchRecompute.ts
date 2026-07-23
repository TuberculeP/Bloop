import { watch } from "vue";
import { useTimelineStore } from "../../stores/timelineStore";
import { useStretchRenderCacheStore } from "../../stores/stretchRenderCacheStore";

// Relance le pré-calcul du cache de stretch (stretchRenderCacheStore) dès que
// la tempo se stabilise — le debounce et la boucle de recalcul vivent dans le
// store lui-même (scheduleRecompute), réutilisés aussi par AudioClipRow.vue
// juste après un resize.
export function useStretchRecompute(): void {
  const timelineStore = useTimelineStore();
  const stretchRenderCacheStore = useStretchRenderCacheStore();

  watch(
    () => timelineStore.tempo,
    () => stretchRenderCacheStore.scheduleRecompute(),
  );
}
