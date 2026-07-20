import { ref, computed, watch, onBeforeUnmount, type Ref } from "vue";
import { useAudioBusStore } from "../../stores/audioBusStore";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import { useUserSamplesStore } from "../../stores/userSamplesStore";
import { useTrackHistoryStore } from "../../stores/trackHistoryStore";
import { useTimelineStore } from "../../stores/timelineStore";
import { getDefaultConfigForType } from "../../lib/audio/instrumentFactory";
import { encodeWav } from "../../lib/audio/exportEncoders";
import { useVoiceRecorder } from "../useVoiceRecorder";
import { ticksPerSecond } from "../../lib/audio/timeGrid";

export interface VoiceRecordingPlaybackDeps {
  isPlaying: Ref<boolean>;
  checkpointPosition: Ref<number>;
  startPlayback: () => void;
  stopPlayback: () => void;
}

/**
 * Enregistrement voix : device picker, recording, décodage, upload sample et
 * création du clip sur une nouvelle piste audio. `playback.stopPlayback` déclenche
 * `finishVoiceRecording` via le callback `onStop` de useTimelinePlaybackEngine,
 * donc `toggleVoiceRecording` n'a pas besoin de l'appeler lui-même (idem ancien code).
 */
export function useTimelineVoiceRecording(
  playback: VoiceRecordingPlaybackDeps,
) {
  const audioBusStore = useAudioBusStore();
  const audioLibraryStore = useAudioLibraryStore();
  const userSamplesStore = useUserSamplesStore();
  const trackHistoryStore = useTrackHistoryStore();
  const timelineStore = useTimelineStore();

  const {
    isSupported: voiceRecorderSupported,
    state: voiceRecorderState,
    elapsedMs: voiceElapsedMs,
    level: voiceLevel,
    error: voiceRecorderError,
    devices: voiceDevices,
    selectedDeviceId: selectedMicId,
    start: startVoiceRecording,
    stop: stopVoiceRecording,
    requestPermission: requestMicPermission,
  } = useVoiceRecorder();

  const isRecordingVoice = computed(
    () => voiceRecorderState.value === "recording",
  );
  const showMicPicker = ref(false);
  const recordingStartPosition = ref(0);

  const voiceRecordedTime = computed(() => {
    const totalSeconds = Math.floor(voiceElapsedMs.value / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  });

  const generateVoiceTrackName = (): string => {
    const existingNames = new Set(
      timelineStore.project.tracks.map((t) => t.name),
    );
    let counter = 1;
    let name = `Voice ${counter}`;
    while (existingNames.has(name)) {
      counter++;
      name = `Voice ${counter}`;
    }
    return name;
  };

  const finishVoiceRecording = async () => {
    const blob = await stopVoiceRecording();
    if (!blob) return;

    const trackName = generateVoiceTrackName();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioBusStore.audioContext.decodeAudioData(
        await blob.arrayBuffer(),
      );
    } catch (error) {
      console.error("Failed to decode recording:", error);
      return;
    }
    const wavBlob = encodeWav(audioBuffer);
    const file = new File([wavBlob], `${trackName}.wav`, {
      type: "audio/wav",
    });

    const sample = await userSamplesStore.uploadSample(file);
    if (!sample) return;

    await audioLibraryStore.loadSample(sample.id);
    const loadedSample = audioLibraryStore.getSample(sample.id);
    if (!loadedSample) return;

    const config = getDefaultConfigForType("audioTrack");
    const trackId = timelineStore.createTrack(config, trackName);

    const tickRate = ticksPerSecond(timelineStore.tempo);
    const durationInSteps = Math.max(
      1,
      Math.ceil(loadedSample.duration * tickRate),
    );

    trackHistoryStore.recordAddClip(
      trackId,
      {
        sampleId: sample.id,
        x: Math.round(recordingStartPosition.value),
        w: durationInSteps,
        startOffset: 0,
      },
      loadedSample,
    );
  };

  const toggleVoiceRecording = async () => {
    if (!voiceRecorderSupported) return;

    if (isRecordingVoice.value) {
      playback.stopPlayback();
      return;
    }

    recordingStartPosition.value = playback.checkpointPosition.value;
    await startVoiceRecording();
    if (voiceRecorderState.value !== "recording") return;
    if (!playback.isPlaying.value) {
      playback.startPlayback();
    }
  };

  const toggleMicPicker = async () => {
    showMicPicker.value = !showMicPicker.value;
    if (showMicPicker.value) {
      await requestMicPermission();
    }
  };

  const selectMic = (deviceId: string) => {
    selectedMicId.value = deviceId;
    showMicPicker.value = false;
  };

  const closeMicPicker = () => {
    showMicPicker.value = false;
  };

  let micErrorTimeout: ReturnType<typeof setTimeout> | null = null;
  watch(voiceRecorderError, (message) => {
    if (!message) return;
    if (micErrorTimeout) clearTimeout(micErrorTimeout);
    micErrorTimeout = setTimeout(() => {
      voiceRecorderError.value = null;
    }, 6000);
  });

  onBeforeUnmount(() => {
    if (micErrorTimeout) clearTimeout(micErrorTimeout);
  });

  return {
    voiceRecorderSupported,
    voiceLevel,
    voiceRecorderError,
    voiceDevices,
    selectedMicId,
    isRecordingVoice,
    showMicPicker,
    voiceRecordedTime,
    finishVoiceRecording,
    toggleVoiceRecording,
    toggleMicPicker,
    selectMic,
    closeMicPicker,
  };
}
