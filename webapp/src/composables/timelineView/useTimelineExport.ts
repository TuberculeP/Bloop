import { ref, watch, type Ref, type ComputedRef } from "vue";
import { useRouter } from "vue-router";
import { useAudioBusStore } from "../../stores/audioBusStore";
import { useTimelineStore } from "../../stores/timelineStore";
import { useProjectStore } from "../../stores/projectStore";
import { useDawLoadingStore } from "../../stores/dawLoadingStore";
import { encodeWav, encodeMp3 } from "../../lib/audio/exportEncoders";

export interface TimelineExportPlaybackDeps {
  isPlaying: Ref<boolean>;
  currentPosition: Ref<number>;
  checkpointPosition: Ref<number>;
  loopEndPosition: ComputedRef<number>;
  startPlayback: () => void;
  stopPlayback: () => void;
  stopAllActiveNotes: () => void;
  stopAllActiveClips: () => void;
  haltAnimation: () => void;
}

/**
 * Export audio (WAV/MP3). `finishExport` remet la position à 0 (contrairement à
 * playback.stopPlayback qui revient au checkpoint) et ne déclenche pas la
 * finalisation d'un enregistrement voix en cours - comportement identique à
 * l'ancien TimelineView.vue.
 */
export function useTimelineExport(
  playback: TimelineExportPlaybackDeps,
  exportModeProp: Ref<boolean | undefined>,
) {
  const router = useRouter();
  const audioBusStore = useAudioBusStore();
  const timelineStore = useTimelineStore();
  const projectStore = useProjectStore();
  const dawLoadingStore = useDawLoadingStore();

  const isExporting = ref(false);
  const exportProgress = ref(0);
  const isManualExport = ref(false);
  const exportFormat = ref<"wav" | "mp3">("mp3");
  const showExportModal = ref(false);
  const metronomeEnabledBeforeExport = ref(false);

  const openExportModal = () => {
    showExportModal.value = true;
  };

  const cancelExportModal = () => {
    showExportModal.value = false;
  };

  const startExport = async () => {
    await audioBusStore.ensureAudioContextResumed();
    isExporting.value = true;
    isManualExport.value = true;
    exportProgress.value = 0;

    if (playback.isPlaying.value) playback.stopPlayback();
    metronomeEnabledBeforeExport.value = timelineStore.metronomeEnabled;
    timelineStore.metronomeEnabled = false;

    audioBusStore.startPcmCapture();

    playback.checkpointPosition.value = 0;
    playback.startPlayback();
  };

  const confirmExport = () => {
    showExportModal.value = false;
    startExport();
  };

  const finishExport = () => {
    playback.haltAnimation();
    playback.stopAllActiveNotes();
    playback.stopAllActiveClips();
    playback.currentPosition.value = 0;
    playback.checkpointPosition.value = 0;

    const buffer = audioBusStore.stopPcmCapture();
    const blob =
      exportFormat.value === "wav" ? encodeWav(buffer) : encodeMp3(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${timelineStore.project.name || "projet"}.${exportFormat.value}`;
    a.click();
    URL.revokeObjectURL(url);
    isExporting.value = false;
    isManualExport.value = false;
    timelineStore.metronomeEnabled = metronomeEnabledBeforeExport.value;
    projectStore.markExportSuccess();
    if (exportModeProp.value) router.push({ name: "app-main" });
  };

  watch(
    () => dawLoadingStore.isComplete,
    (complete) => {
      if (complete && exportModeProp.value && !isExporting.value) {
        startExport();
      }
    },
  );

  watch(playback.currentPosition, (position) => {
    if (
      (exportModeProp.value || isManualExport.value) &&
      playback.loopEndPosition.value > 0
    ) {
      exportProgress.value = Math.min(
        100,
        Math.round((position / playback.loopEndPosition.value) * 100),
      );
    }
  });

  return {
    isExporting,
    exportProgress,
    isManualExport,
    exportFormat,
    showExportModal,
    openExportModal,
    cancelExportModal,
    confirmExport,
    finishExport,
    startExport,
  };
}
