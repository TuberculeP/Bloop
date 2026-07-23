import { watch, onBeforeUnmount } from "vue";
import { useTimelineStore } from "../../stores/timelineStore";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import { useAudioBusStore } from "../../stores/audioBusStore";
import { useStretchRenderCacheStore } from "../../stores/stretchRenderCacheStore";

// Un changement de BPM (ou un resize en mode stretch) change le playbackRate
// d'un clip stretché — les rendus déjà en cache (stretchRenderCacheStore)
// deviennent obsolètes (cache miss naturel, la clé inclut le playbackRate).
// scheduleStretchRecompute relance un pré-calcul en fond pour tous les clips
// stretchés du projet dès que ça se stabilise, pour qu'un premier play soit
// déjà rapide plutôt que de dépendre du fallback "cache miss → lecture live +
// re-cache" de trackAudioStore.
//
// Debounce (comme createDebouncer dans timelineStore.ts) : taper "140" au
// clavier déclenche tempo=1 puis 14 puis 140 — sans debounce on relancerait
// un recalcul pour chaque valeur intermédiaire. Même logique pour un resize :
// plusieurs ajustements fins rapprochés ne doivent relancer qu'un seul calcul.
const DEBOUNCE_MS = 600;

let timeoutId: ReturnType<typeof setTimeout> | null = null;

async function recomputeStretchedClips(): Promise<void> {
  const timelineStore = useTimelineStore();
  const audioLibraryStore = useAudioLibraryStore();
  const audioBusStore = useAudioBusStore();
  const stretchRenderCacheStore = useStretchRenderCacheStore();

  const tempo = timelineStore.tempo;
  for (const track of timelineStore.project.tracks) {
    if (track.instrument.type !== "audioTrack" || !track.clips) continue;
    for (const clip of track.clips) {
      if (!clip.stretched) continue;
      const buffer = await audioLibraryStore.loadSample(clip.sampleId);
      if (!buffer) continue;
      stretchRenderCacheStore.ensureStretchedClipCached(
        clip,
        buffer,
        tempo,
        audioBusStore.audioContext,
      );
    }
  }
}

// Fonction de module (pas liée au cycle de vie d'un composant) : appelable
// depuis n'importe où — le watcher de tempo ci-dessous, ou directement
// depuis AudioClipRow.vue juste après un resize en mode stretch — sans
// prop-drilling ni second watcher redondant.
export function scheduleStretchRecompute(): void {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    timeoutId = null;
    recomputeStretchedClips();
  }, DEBOUNCE_MS);
}

export function useStretchRecompute(): void {
  const timelineStore = useTimelineStore();

  watch(() => timelineStore.tempo, scheduleStretchRecompute);

  onBeforeUnmount(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}
