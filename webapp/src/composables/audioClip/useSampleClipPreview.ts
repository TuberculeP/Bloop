import { ref, onBeforeUnmount } from "vue";
import type { AudioClip } from "../../lib/utils/types";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import { useAudioBusStore } from "../../stores/audioBusStore";
import { useTimelineStore } from "../../stores/timelineStore";
import { computeClipPlaybackParams } from "../../lib/audio/clipStretch";
import {
  createStretchVoice,
  ensureStretchEngineReady,
  type StretchVoice,
} from "../../lib/audio/engines/stretchEngine";

// Preview d'un clip dans la modale d'édition : indépendant du scheduler de
// la timeline (jouable même piste arrêtée), toujours via le moteur de
// stretch/pitch partagé pour que le tune (vrai pitch-shift) soit audible
// même sur un clip non stretché — le preview existant de l'audiothèque
// (audioLibraryStore.startPreview) ne gère ni playbackRate ni detune.
export function useSampleClipPreview() {
  const isPreviewing = ref(false);
  let voice: StretchVoice | null = null;

  const stopPreview = (): void => {
    if (voice) {
      try {
        voice.stop();
      } catch {
        // Ignore if already stopped
      }
      voice = null;
    }
    isPreviewing.value = false;
  };

  const startPreview = async (clip: AudioClip): Promise<void> => {
    stopPreview();

    const audioLibraryStore = useAudioLibraryStore();
    const audioBusStore = useAudioBusStore();
    const timelineStore = useTimelineStore();

    const buffer = await audioLibraryStore.loadSample(clip.sampleId);
    if (!buffer) return;

    await audioBusStore.ensureAudioContextResumed();
    await ensureStretchEngineReady(audioBusStore.audioContext);

    const params = computeClipPlaybackParams(clip, timelineStore.tempo);
    const stretchVoice = createStretchVoice({
      context: audioBusStore.audioContext,
      buffer,
      playbackRate: params.playbackRate,
      detuneCents: params.detuneCents,
    });
    stretchVoice.connect(audioBusStore.inputBus);
    stretchVoice.onended = () => {
      if (voice === stretchVoice) {
        voice = null;
        isPreviewing.value = false;
      }
    };
    stretchVoice.start(0, params.offsetSeconds, params.durationSeconds);

    voice = stretchVoice;
    isPreviewing.value = true;
  };

  onBeforeUnmount(stopPreview);

  return { isPreviewing, startPreview, stopPreview };
}
