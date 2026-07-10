<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  inject,
  watch,
  type Ref,
} from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { vOnClickOutside } from "@vueuse/components";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useTrackAudioStore } from "../../../stores/trackAudioStore";
import { useProjectStore } from "../../../stores/projectStore";
import { useDawLoadingStore } from "../../../stores/dawLoadingStore";
import { useAudioBusStore } from "../../../stores/audioBusStore";
import { useAudioLibraryStore } from "../../../stores/audioLibraryStore";
import { useTrackHistoryStore } from "../../../stores/trackHistoryStore";
import type {
  Track,
  InstrumentType,
  MidiNote,
  AudioClip,
  NoteName,
} from "../../../lib/utils/types";
import { getAutomationValueAt } from "../../../lib/audio/automation";
import { getDefaultConfigForType } from "../../../lib/audio/instrumentFactory";
<<<<<<< HEAD
import { useVoiceRecorder } from "../../../composables/useVoiceRecorder";
=======
import { useSampleFileDrop } from "../../../composables/useSampleFileDrop";
import { encodeWav, encodeMp3 } from "../../../lib/audio/exportEncoders";
>>>>>>> origin/staging
import TimelineRuler from "./TimelineRuler.vue";
import TrackRow from "./TrackRow.vue";
import MasterTrackRow from "./MasterTrackRow.vue";
import AddTrackButton from "./AddTrackButton.vue";
import InstrumentSettings from "../instruments/InstrumentSettings.vue";
import MasterSettings from "../instruments/MasterSettings.vue";
import BaseButton from "../../ui/BaseButton.vue";

const emit = defineEmits<{
  (
    e: "note-start",
    note: MidiNote,
    noteName: NoteName,
    position: number,
    trackId: string,
  ): void;
  (
    e: "note-end",
    note: MidiNote,
    noteName: NoteName,
    position: number,
    trackId: string,
  ): void;
}>();

const props = defineProps<{
  exportMode?: boolean;
}>();

const router = useRouter();
const route = useRoute();
const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();
const projectStore = useProjectStore();
const dawLoadingStore = useDawLoadingStore();
const audioBusStore = useAudioBusStore();
const audioLibraryStore = useAudioLibraryStore();
<<<<<<< HEAD
const trackHistoryStore = useTrackHistoryStore();
=======
const { placeFilesOnTrack } = useSampleFileDrop();
>>>>>>> origin/staging

const { isReadOnly, currentProjectOwner } = storeToRefs(projectStore);

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

const isCloning = ref(false);
const isSaving = ref(false);
const saveMessage = ref<{ type: "success" | "error"; text: string } | null>(
  null,
);

const COL_WIDTH = 20;
const ROW_HEIGHT = 75;

const scrollLeft = ref(0);
const scrollContainerRef = ref<HTMLElement | null>(null);

const isPlaying = ref(false);
const currentPosition = ref(0);
const checkpointPosition = ref(0);
const playbackStartTime = ref(0);
const animationFrameId = ref<number | null>(null);

const settingsTrack = ref<Track | null>(null);
const showSettings = ref(false);
const showMasterSettings = ref(false);
const showAudioLibrary = inject<Ref<boolean>>("showAudioLibrary", ref(false));

const isEditingProjectName = ref(false);
const editedProjectName = ref("");
const projectNameInputRef = ref<HTMLInputElement | null>(null);

const sortedTracks = computed(() => timelineStore.sortedTracks);

const TRACK_HEADER_WIDTH = 180;
const TRAILING_COLS = 16;

watch(
  () => route.query.projectId,
  async (newId) => {
    if (
      newId &&
      typeof newId === "string" &&
      newId !== timelineStore.project.id
    ) {
      await projectStore.loadProjectToTimeline(newId, timelineStore);
      await dawLoadingStore.preloadProject(timelineStore.project);
    }
  },
);

const displayCols = computed(() => {
  let lastEnd = 0;
  for (const track of timelineStore.tracks) {
    for (const note of track.notes) {
      lastEnd = Math.max(lastEnd, note.x + note.w);
    }
    for (const clip of track.clips ?? []) {
      lastEnd = Math.max(lastEnd, clip.x + clip.w);
    }
  }
  const minCols = Math.ceil(lastEnd / 4) * 4 + TRAILING_COLS;
  return Math.max(timelineStore.project.cols, minCols);
});

const cursorStyle = computed(() => ({
  transform: `translateX(${currentPosition.value * COL_WIDTH + TRACK_HEADER_WIDTH}px)`,
}));

const checkpointStyle = computed(() => ({
  left: `${checkpointPosition.value * COL_WIDTH + TRACK_HEADER_WIDTH}px`,
}));

const loopEndPosition = computed(() => {
  let lastEnd = 0;

  for (const track of timelineStore.getPlayableTracks()) {
    // Notes (tracks MIDI)
    for (const note of track.notes) {
      const noteEnd = note.x + note.w;
      if (noteEnd > lastEnd) lastEnd = noteEnd;
    }

    // Clips (audio tracks)
    for (const clip of track.clips ?? []) {
      const clipEnd = clip.x + clip.w;
      if (clipEnd > lastEnd) lastEnd = clipEnd;
    }
  }

  if (lastEnd === 0) return timelineStore.project.cols;
  return Math.ceil(lastEnd / 4) * 4;
});

const noteNamesDescending = [
  "B",
  "A#",
  "A",
  "G#",
  "G",
  "F#",
  "F",
  "E",
  "D#",
  "D",
  "C#",
  "C",
];

const noteIndexToName = (index: number): NoteName => {
  const octave = 7 - Math.floor(index / 12);
  const noteIndex = index % 12;
  return `${noteNamesDescending[noteIndex]}${octave}` as NoteName;
};

const activeNotes = ref<Map<string, { trackId: string; noteId: string }>>(
  new Map(),
);

const activeClips = ref<Map<string, { trackId: string; clip: AudioClip }>>(
  new Map(),
);

// Export audio
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

const confirmExport = () => {
  showExportModal.value = false;
  startExport();
};

const finishExport = () => {
  stopAllActiveNotes();
  stopAllActiveClips();
  isPlaying.value = false;
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }
  currentPosition.value = 0;
  checkpointPosition.value = 0;

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
  if (props.exportMode) router.push({ name: "app-main" });
};

const startExport = async () => {
  await audioBusStore.ensureAudioContextResumed();
  isExporting.value = true;
  isManualExport.value = true;
  exportProgress.value = 0;

  if (isPlaying.value) stopPlayback();
  metronomeEnabledBeforeExport.value = timelineStore.metronomeEnabled;
  timelineStore.metronomeEnabled = false;

  audioBusStore.startPcmCapture();

  checkpointPosition.value = 0;
  startPlayback();
};

watch(
  () => dawLoadingStore.isComplete,
  (complete) => {
    if (complete && props.exportMode && !isExporting.value) {
      startExport();
    }
  },
);

// Playback - lit directement les notes des tracks (plus de clips)
const playNotesAtPosition = (position: number) => {
  const intPosition = Math.floor(position);

  for (const track of timelineStore.getPlayableTracks()) {
    for (const note of track.notes) {
      const noteKey = `${track.id}_${note.i}`;
      const noteStart = note.x;
      const noteEnd = note.x + note.w;

      // Déclencher la note au début
      if (intPosition === noteStart && !activeNotes.value.has(noteKey)) {
        const noteName = noteIndexToName(note.y);
        trackAudioStore.playNoteOnTrack(track.id, noteName, note.i);
        activeNotes.value.set(noteKey, { trackId: track.id, noteId: note.i });
        emit("note-start", note, noteName, intPosition, track.id);
      }

      // Arrêter la note à la fin
      if (intPosition >= noteEnd && activeNotes.value.has(noteKey)) {
        const noteName = noteIndexToName(note.y);
        trackAudioStore.stopNoteOnTrack(track.id, note.i);
        activeNotes.value.delete(noteKey);
        emit("note-end", note, noteName, intPosition, track.id);
      }
    }
  }
};

const playClipsAtPosition = (position: number) => {
  const intPosition = Math.floor(position);

  for (const track of timelineStore.getPlayableTracks()) {
    if (track.instrument.type !== "audioTrack") continue;

    for (const clip of track.clips ?? []) {
      const clipKey = `${track.id}_${clip.id}`;
      const clipStart = clip.x;
      const clipEnd = clip.x + clip.w;

      if (intPosition >= clipStart && intPosition < clipEnd) {
        if (!activeClips.value.has(clipKey)) {
          const offsetInClip = intPosition - clipStart;
          trackAudioStore.playClipOnTrack(track.id, clip, offsetInClip);
          activeClips.value.set(clipKey, { trackId: track.id, clip });
        }
      }

      if (intPosition >= clipEnd && activeClips.value.has(clipKey)) {
        trackAudioStore.stopClipOnTrack(track.id, clip.id);
        activeClips.value.delete(clipKey);
      }
    }
  }
};

// Métronome - clic direct sur la destination audio, indépendant du bus master
// (pas d'EQ/reverb, et non capturé par l'export audio)
const playMetronomeClick = (accent: boolean) => {
  const ctx = audioBusStore.audioContext;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = accent ? 1500 : 1000;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
};

// 4 colonnes = 1 temps (noire), 16 colonnes = 1 mesure en 4/4
const maybePlayMetronomeAt = (position: number) => {
  if (!timelineStore.metronomeEnabled) return;
  const intPosition = Math.floor(position);
  if (intPosition % 4 !== 0) return;
  playMetronomeClick(intPosition % 16 === 0);
};

const stopAllActiveNotes = () => {
  for (const [_, { trackId, noteId }] of activeNotes.value) {
    trackAudioStore.stopNoteOnTrack(trackId, noteId);
  }
  activeNotes.value.clear();
};

const triggerNotesAtPosition = (position: number) => {
  const intPosition = Math.floor(position);

  for (const track of timelineStore.getPlayableTracks()) {
    for (const note of track.notes) {
      const noteKey = `${track.id}_${note.i}`;
      const noteStart = note.x;
      const noteEnd = note.x + note.w;

      if (
        intPosition >= noteStart &&
        intPosition < noteEnd &&
        !activeNotes.value.has(noteKey)
      ) {
        const noteName = noteIndexToName(note.y);
        trackAudioStore.playNoteOnTrack(track.id, noteName, note.i);
        activeNotes.value.set(noteKey, { trackId: track.id, noteId: note.i });
        emit("note-start", note, noteName, intPosition, track.id);
      }
    }
  }
};

const stopAllActiveClips = () => {
  for (const [_, { trackId, clip }] of activeClips.value) {
    trackAudioStore.stopClipOnTrack(trackId, clip.id);
  }
  activeClips.value.clear();
};

const applyAutomationAtPosition = (position: number) => {
  for (const track of timelineStore.getPlayableTracks()) {
    for (const lane of track.automationLanes ?? []) {
      if (lane.points.length === 0) continue;
      const value = getAutomationValueAt(lane.points, position);
      trackAudioStore.applyAutomation(track.id, lane.parameter, value);
    }
  }
  for (const lane of timelineStore.masterAutomationLanes) {
    if (lane.points.length === 0) continue;
    const value = getAutomationValueAt(lane.points, position);
    audioBusStore.applyMasterAutomation(lane.parameter, value);
  }
};

const animate = () => {
  if (!isPlaying.value) return;

  const elapsed = (performance.now() - playbackStartTime.value) / 1000;
  const stepsPerSecond = (timelineStore.tempo / 60) * 4;
  let newPosition = checkpointPosition.value + elapsed * stepsPerSecond;

  if (newPosition >= loopEndPosition.value) {
    if (props.exportMode || isManualExport.value) {
      finishExport();
      return;
    }
    stopAllActiveNotes();
    stopAllActiveClips();
    newPosition = 0;
    playbackStartTime.value =
      performance.now() + (checkpointPosition.value / stepsPerSecond) * 1000;
    triggerNotesAtPosition(newPosition);
    projectStore.markPlaybackLooped();
  }

  const prevIntPosition = Math.floor(currentPosition.value);
  const newIntPosition = Math.floor(newPosition);

  currentPosition.value = newPosition;

  if ((props.exportMode || isManualExport.value) && loopEndPosition.value > 0) {
    exportProgress.value = Math.min(
      100,
      Math.round((newPosition / loopEndPosition.value) * 100),
    );
  }

  if (newIntPosition !== prevIntPosition) {
    playNotesAtPosition(newPosition);
    playClipsAtPosition(newPosition);
    maybePlayMetronomeAt(newPosition);
  }

  applyAutomationAtPosition(newPosition);

  animationFrameId.value = requestAnimationFrame(animate);
};

const startPlayback = () => {
  if (isPlaying.value) return;
  audioLibraryStore.stopPreview();
  audioBusStore.ensureAudioContextResumed();

  currentPosition.value = checkpointPosition.value;
  isPlaying.value = true;
  playbackStartTime.value = performance.now();

  triggerNotesAtPosition(currentPosition.value);
  playClipsAtPosition(currentPosition.value);
  maybePlayMetronomeAt(currentPosition.value);

  animationFrameId.value = requestAnimationFrame(animate);
};

const stopPlayback = () => {
  isPlaying.value = false;
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }
  stopAllActiveNotes();
  currentPosition.value = checkpointPosition.value;
  stopAllActiveClips();

  if (isRecordingVoice.value) {
    finishVoiceRecording();
  }
};

const togglePlayback = () => {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
};

const setCheckpoint = (position: number) => {
  checkpointPosition.value = position;
  if (isPlaying.value) {
    stopAllActiveNotes();
    stopAllActiveClips();
    currentPosition.value = position;
    playbackStartTime.value = performance.now();
    triggerNotesAtPosition(position);
  } else {
    currentPosition.value = position;
  }
};

const handleAddTrack = (type: InstrumentType) => {
  const config = getDefaultConfigForType(type);
  timelineStore.createTrack(config);
};

<<<<<<< HEAD
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
  const sample = await audioLibraryStore.createLocalSampleFromRecording(
    blob,
    trackName,
  );
  if (!sample) return;

  const config = getDefaultConfigForType("audioTrack");
  const trackId = timelineStore.createTrack(config, trackName);

  const stepsPerSecond = (timelineStore.tempo / 60) * 4;
  const durationInSteps = Math.max(
    1,
    Math.ceil(sample.duration * stepsPerSecond),
  );

  trackHistoryStore.recordAddClip(
    trackId,
    {
      sampleId: sample.id,
      x: Math.round(recordingStartPosition.value),
      w: durationInSteps,
      startOffset: 0,
    },
    sample,
  );
};

const toggleVoiceRecording = async () => {
  if (!voiceRecorderSupported) return;

  if (isRecordingVoice.value) {
    stopPlayback();
    return;
  }

  recordingStartPosition.value = checkpointPosition.value;
  await startVoiceRecording();
  if (voiceRecorderState.value !== "recording") return;
  if (!isPlaying.value) {
    startPlayback();
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

=======
const isDragOverTimeline = ref(false);
const tracksContainerRef = ref<HTMLElement | null>(null);

const handleTracksContainerDragOver = (event: DragEvent): void => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  isDragOverTimeline.value = true;
};

const handleTracksContainerDragLeave = (): void => {
  isDragOverTimeline.value = false;
};

const handleTracksContainerDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault();
  isDragOverTimeline.value = false;

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const rect = tracksContainerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = Math.floor(
    (event.clientX - rect.left - TRACK_HEADER_WIDTH) / COL_WIDTH,
  );

  const trackId = timelineStore.createTrack(
    getDefaultConfigForType("audioTrack"),
  );
  await placeFilesOnTrack(files, trackId, x);
};

>>>>>>> origin/staging
const handleToggleMute = (track: Track) => {
  timelineStore.setTrackMuted(track.id, !track.muted);
};

const handleToggleSolo = (track: Track) => {
  timelineStore.setTrackSolo(track.id, !track.solo);
};

const handleSelectTrack = (track: Track) => {
  timelineStore.setActiveTrack(track.id);
};

const handleDeleteTrack = (track: Track) => {
  if (confirm(`Supprimer la piste "${track.name}" ?`)) {
    timelineStore.deleteTrack(track.id);
  }
};

const handleOpenSettings = (track: Track) => {
  settingsTrack.value = track;
  showSettings.value = true;
};

const handleCloseSettings = () => {
  showSettings.value = false;
  settingsTrack.value = null;
};

const handleToggleExpand = (track: Track) => {
  timelineStore.toggleTrackExpanded(track.id);
};

const startEditProjectName = () => {
  editedProjectName.value = timelineStore.project.name;
  isEditingProjectName.value = true;
  setTimeout(() => projectNameInputRef.value?.select(), 0);
};

const saveProjectName = () => {
  const trimmed = editedProjectName.value.trim();
  if (trimmed && trimmed !== timelineStore.project.name) {
    timelineStore.renameProject(trimmed);
  }
  isEditingProjectName.value = false;
};

const cancelEditProjectName = () => {
  isEditingProjectName.value = false;
};

const handleRenameTrack = (track: Track) => {
  const newName = prompt("Nouveau nom de la piste :", track.name);
  if (newName && newName.trim() && newName.trim() !== track.name) {
    timelineStore.renameTrack(track.id, newName.trim());
  }
};

const handleSaveProject = async () => {
  if (isSaving.value) return;

  isSaving.value = true;
  saveMessage.value = null;

  try {
    const result = await projectStore.saveProjectOnline(timelineStore.project);

    if (result.success && result.projectId) {
      saveMessage.value = { type: "success", text: "Projet sauvegardé" };
      router.replace({
        name: "app-sequencer",
        query: { projectId: result.projectId },
      });
    } else {
      saveMessage.value = {
        type: "error",
        text: result.error || "Erreur de sauvegarde",
      };
    }
  } catch {
    saveMessage.value = { type: "error", text: "Erreur de sauvegarde" };
  } finally {
    isSaving.value = false;
    setTimeout(() => {
      saveMessage.value = null;
    }, 3000);
  }
};

const handleBackToProjects = () => {
  router.push({ name: "app-main" });
};

const handleResetReadOnly = async () => {
  if (!projectStore.currentProjectId) return;
  await projectStore.loadProjectToTimeline(
    projectStore.currentProjectId,
    timelineStore,
  );
  await dawLoadingStore.preloadProject(timelineStore.project);
};

const handleCloneProject = async () => {
  if (!projectStore.currentProjectId || isCloning.value) return;
  isCloning.value = true;
  const result = await projectStore.cloneProject(projectStore.currentProjectId);
  isCloning.value = false;
  if (result.success && result.projectId) {
    router.replace({
      name: "app-sequencer",
      query: { projectId: result.projectId },
    });
  }
};

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollLeft.value = target.scrollLeft;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isTypingTarget(event.target)) return;

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  } else if (event.code === "Escape") {
    timelineStore.collapseTrack();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  stopPlayback();
  window.removeEventListener("keydown", handleKeydown);
  if (micErrorTimeout) clearTimeout(micErrorTimeout);
});

defineExpose({
  startPlayback,
  stopPlayback,
  togglePlayback,
  setCheckpoint,
});
</script>

<template>
  <div class="timeline-view">
    <!-- Export overlay -->
    <div v-if="isExporting" class="export-overlay">
      <div class="export-card">
        <div class="export-spinner"></div>
        <p class="export-title">Export audio en cours…</p>
        <div class="export-progress-bar">
          <div
            class="export-progress-fill"
            :style="{ width: `${exportProgress}%` }"
          ></div>
        </div>
        <p class="export-percent">{{ exportProgress }}%</p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showExportModal"
        class="modal-overlay"
        @click="cancelExportModal"
      >
        <div class="modal export-format-modal" @click.stop>
          <h3>Exporter le projet</h3>
          <p>Choisissez le format du fichier audio à générer.</p>
          <div class="export-format-options">
            <label
              class="export-format-option"
              :class="{ active: exportFormat === 'mp3' }"
            >
              <input v-model="exportFormat" type="radio" value="mp3" />
              MP3
            </label>
            <label
              class="export-format-option"
              :class="{ active: exportFormat === 'wav' }"
            >
              <input v-model="exportFormat" type="radio" value="wav" />
              WAV
            </label>
          </div>
          <div class="modal-actions">
            <BaseButton
              class="export-cancel-btn"
              variant="secondary"
              @click="cancelExportModal"
            >
              Annuler
            </BaseButton>
            <BaseButton
              class="export-confirm-btn"
              variant="accent"
              @click="confirmExport"
            >
              Exporter
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="timeline-header">
      <div class="header-left">
        <BaseButton
          variant="accent"
          @click="handleBackToProjects"
          title="Retour aux projets"
        >
          <i class="fas fa-home" />
        </BaseButton>
        <BaseButton
          @click="showAudioLibrary = !showAudioLibrary"
          title="Audio Library"
          :variant="showAudioLibrary ? 'secondary' : 'primary'"
        >
          Audio Library
        </BaseButton>
        <input
          v-if="isEditingProjectName"
          ref="projectNameInputRef"
          v-model="editedProjectName"
          class="project-name-input"
          @blur="saveProjectName"
          @keydown.enter="saveProjectName"
          @keydown.escape="cancelEditProjectName"
        />
        <span
          v-else
          class="project-name"
          @dblclick="startEditProjectName"
          title="Double-clic pour renommer"
        >
          {{ timelineStore.project.name }}
        </span>
      </div>
      <div class="header-center">
        <div class="transport-controls">
          <button
            class="transport-btn"
            @click="setCheckpoint(0)"
            title="Retour au début"
          >
            <i class="fas fa-fast-backward"></i>
          </button>
          <button
            class="transport-btn play-btn"
            :class="{ playing: isPlaying }"
            @click="togglePlayback"
            :title="isPlaying ? 'Stop' : 'Play'"
          >
            <i :class="isPlaying ? 'fas fa-stop' : 'fas fa-play'"></i>
          </button>

          <div class="record-control" v-on-click-outside="closeMicPicker">
            <button
              class="transport-btn record-btn-transport"
              :class="{ recording: isRecordingVoice }"
              :disabled="!voiceRecorderSupported"
              @click="toggleVoiceRecording"
              :title="
                isRecordingVoice
                  ? 'Arrêter l\'enregistrement'
                  : 'Enregistrer ma voix'
              "
            >
              <i class="fas fa-circle"></i>
            </button>
            <button
              class="mic-picker-toggle"
              :disabled="!voiceRecorderSupported"
              @click.stop="toggleMicPicker"
              title="Choisir le microphone"
            >
              <i class="fas fa-chevron-down"></i>
            </button>

            <Transition name="fade">
              <div v-if="showMicPicker" class="mic-picker-dropdown">
                <div class="mic-picker-header">Microphone</div>
                <button
                  v-for="(device, index) in voiceDevices"
                  :key="device.deviceId"
                  class="mic-picker-option"
                  :class="{ active: device.deviceId === selectedMicId }"
                  @click="selectMic(device.deviceId)"
                >
                  {{ device.label || `Microphone ${index + 1}` }}
                </button>
                <div v-if="voiceDevices.length === 0" class="mic-picker-empty">
                  Aucun micro détecté
                </div>
              </div>
            </Transition>
          </div>

          <div v-if="isRecordingVoice" class="record-indicator">
            <span
              class="record-indicator-dot"
              :style="{ transform: `scale(${1 + voiceLevel * 0.6})` }"
            ></span>
            REC {{ voiceRecordedTime }}
          </div>
        </div>
        <div class="tempo-control">
          <label>BPM:</label>
          <input
            type="number"
            v-model.number="timelineStore.tempo"
            min="40"
            max="240"
            step="1"
          />
          <button
            class="metronome-toggle"
            :class="{ active: timelineStore.metronomeEnabled }"
            @click="
              timelineStore.metronomeEnabled = !timelineStore.metronomeEnabled
            "
            :title="
              timelineStore.metronomeEnabled
                ? 'Désactiver le métronome'
                : 'Activer le métronome'
            "
          >
            <i class="fas fa-stopwatch"></i>
          </button>
        </div>
        <div class="position-display">
          {{ Math.floor(currentPosition / 4) + 1 }}:{{
            (Math.floor(currentPosition) % 4) + 1
          }}
        </div>
      </div>
      <div class="header-right">
        <AddTrackButton @add-track="handleAddTrack" />

        <BaseButton
          class="export-audio-btn"
          @click="openExportModal"
          title="Exporter en audio"
          :disabled="isExporting"
          variant="ghost"
        >
          Exporter
          <i class="fas fa-download"></i>
        </BaseButton>

        <BaseButton
          class="save-project-btn"
          @click="handleSaveProject"
          :title="
            isReadOnly
              ? 'Projet en lecture seule'
              : projectStore.hasUnsavedChanges
                ? 'Sauvegarder les changements'
                : 'Projet sauvegardé'
          "
          :disabled="isSaving || isReadOnly"
          :variant="
            projectStore.hasUnsavedChanges || saveMessage
              ? 'secondary'
              : 'primary'
          "
        >
          {{
            saveMessage ? saveMessage.text : isSaving ? "..." : "Sauvegarder"
          }}
        </BaseButton>
      </div>
    </div>

    <div v-if="isReadOnly" class="readonly-banner">
      <div class="readonly-banner-info">
        <i class="fas fa-eye"></i>
        <span
          >Projet de
          <strong>{{
            currentProjectOwner
              ? `${currentProjectOwner.firstName} ${currentProjectOwner.lastName}`
              : "…"
          }}</strong>
          — Mode lecture seule</span
        >
      </div>
      <div class="readonly-banner-actions">
        <button
          class="banner-btn"
          @click="handleResetReadOnly"
          title="Revenir à l'état original"
        >
          <i class="fas fa-undo"></i> Réinitialiser
        </button>
        <button
          class="banner-btn banner-btn-primary"
          @click="handleCloneProject"
          :disabled="isCloning"
        >
          <i class="fas fa-copy"></i>
          {{ isCloning ? "Clonage…" : "Cloner dans mes projets" }}
        </button>
      </div>
    </div>

    <div class="timeline-content">
      <div
        ref="scrollContainerRef"
        class="timeline-scroll"
        @scroll="handleScroll"
      >
        <TimelineRuler
          :cols="displayCols"
          :col-width="COL_WIDTH"
          :scroll-left="scrollLeft"
          @seek="setCheckpoint"
        />

        <div
          ref="tracksContainerRef"
          class="tracks-container"
          :class="{ 'drag-over': isDragOverTimeline }"
          @dragover="handleTracksContainerDragOver"
          @dragleave="handleTracksContainerDragLeave"
          @drop="handleTracksContainerDrop"
        >
          <MasterTrackRow
            :cols="displayCols"
            :col-width="COL_WIDTH"
            :scroll-left="scrollLeft"
            @open-settings="showMasterSettings = true"
          />

          <TrackRow
            v-for="track in sortedTracks"
            :key="track.id"
            :track="track"
            :cols="displayCols"
            :col-width="COL_WIDTH"
            :row-height="ROW_HEIGHT"
            :is-expanded="track.id === timelineStore.expandedTrackId"
            :is-active="track.id === timelineStore.activeTrackId"
            :playback-position="currentPosition"
            :is-playing="isPlaying"
            :scroll-left="scrollLeft"
            @toggle-mute="handleToggleMute"
            @toggle-solo="handleToggleSolo"
            @select-track="handleSelectTrack"
            @rename-track="handleRenameTrack"
            @delete-track="handleDeleteTrack"
            @open-settings="handleOpenSettings"
            @toggle-expand="handleToggleExpand"
          />

          <div v-if="sortedTracks.length === 0" class="empty-state">
            <p>Aucune piste</p>
            <p class="hint">
              Cliquez sur "Ajouter" pour créer votre première piste
            </p>
          </div>
        </div>

        <div class="checkpoint-marker" :style="checkpointStyle" />
        <div v-if="isPlaying" class="playhead" :style="cursorStyle" />
      </div>
    </div>

    <InstrumentSettings
      v-if="settingsTrack"
      :track="settingsTrack"
      :visible="showSettings"
      @close="handleCloseSettings"
    />

    <MasterSettings
      :visible="showMasterSettings"
      @close="showMasterSettings = false"
    />

    <Teleport to="body">
      <div v-if="voiceRecorderError" class="voice-warning-toast">
        <i class="fas fa-exclamation-triangle"></i>
        {{ voiceRecorderError }}
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.timeline-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a0e15;
  color: #f2efe8;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg-secondary-dark);
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);
}

.header-left,
.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  justify-content: flex-end;
}

.header-btn {
  padding: 8px 16px;
  border: 1px solid rgba(122, 15, 62, 0.5);
  border-radius: 6px;
  background: var(--color-bg-secondary-dark);
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-primary-active);
    border-color: var(--color-accent2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.back-btn {
  padding: 8px 12px;
}

.library-btn {
  padding: 8px 12px;
  font-size: 14px;

  &.active {
    background: var(--color-accent3);
    border-color: #ff3fb4;
  }
}

.save-indicator-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unsaved-indicator {
  color: #fbbf24;
  font-size: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.save-btn {
  background: var(--color-accent3);
  border-color: var(--color-accent3);

  &:hover {
    background: #9b2458;
  }

  &.saving {
    opacity: 0.7;
  }

  &.has-changes {
    border-color: #fbbf24;
  }
}

.export-btn {
  border-radius: 6px;
  background: transparent;
  border-color: var(--color-border-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.save-message {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;

  &.success {
    color: #22c55e;
  }

  &.error {
    color: #ef4444;
  }
}

.header-center {
  display: flex;
  align-items: center;
  gap: 24px;
}

.project-name {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f2efe8;
  }
}

.project-name-input {
  font-size: 14px;
  color: #f2efe8;
  background: #1a0e15;
  border: 1px solid #ff3fb4;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  max-width: 200px;
}

.transport-controls {
  display: flex;
  gap: 8px;
}

.transport-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--color-accent3);
  color: #f2efe8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #9b2458;
  }

  &.play-btn {
    background: #ff3fb4;

    &:hover {
      background: #ff62c2;
    }

    &.playing {
      background: #ed2aa1;
    }
  }
}

.record-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
}

.record-btn-transport {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--color-accent3);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    color: #ef4444;
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    background: #9b2458;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.recording {
    background: #ef4444;
    animation: record-pulse 1.4s ease-in-out infinite;

    i {
      color: #fff;
    }
  }
}

@keyframes record-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

.mic-picker-toggle {
  width: 18px;
  height: 40px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 10px;

  &:hover:not(:disabled) {
    color: #f2efe8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.mic-picker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  background: #2d0f20;
  border: 1px solid rgba(122, 15, 62, 0.5);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 100;
}

.mic-picker-header {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  background: #1a0e15;
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);
}

.mic-picker-option {
  width: 100%;
  display: block;
  text-align: left;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: #f2efe8;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #3d1528;
  }

  &.active {
    color: #ff3fb4;
    font-weight: 600;
  }
}

.mic-picker-empty {
  padding: 10px 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.record-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.record-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transition: transform 0.05s linear;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.tempo-control {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  input {
    width: 60px;
    padding: 6px 8px;
    border: 1px solid rgba(122, 15, 62, 0.5);
    border-radius: 4px;
    background-color: var(--color-bg-secondary-dark);
    color: #f2efe8;
    font-size: 14px;
    text-align: center;
    color-scheme: dark;

    &:focus {
      outline: none;
      border-color: #ff3fb4;
    }
  }
}

.metronome-toggle {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(122, 15, 62, 0.5);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #ff3fb4;
    color: #f2efe8;
  }

  &.active {
    background: #ff3fb4;
    border-color: #ff3fb4;
    color: #f2efe8;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;

  h3 {
    color: var(--color-white);
    font-size: 1.25rem;
    margin: 0 0 12px;
  }

  p {
    color: var(--color-white-light);
    opacity: 0.75;
    margin: 0 0 24px;
    font-size: 0.95rem;
    line-height: 1.5;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.export-format-options {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.export-format-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(122, 15, 62, 0.5);
  border-radius: 8px;
  color: #f2efe8;
  font-size: 14px;
  cursor: pointer;

  &.active {
    border-color: #ff3fb4;
    background-color: rgba(255, 63, 180, 0.1);
  }

  input {
    accent-color: #ff3fb4;
  }
}

.position-display {
  font-family: monospace;
  font-size: 16px;
  min-width: 60px;
  text-align: center;
  padding: 6px 12px;
  background-color: var(--color-bg-secondary-dark);
  color: #f2efe8;
  border-radius: 4px;
}

.timeline-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.timeline-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  position: relative;
  background: #1a0e15;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none; // Firefox
}

.tracks-container {
  position: relative;
  min-height: calc(100% - 30px);
  background: #1a0e15;
  transition: background 0.15s;

  &.drag-over {
    background: rgba(255, 63, 180, 0.08);
    outline: 2px dashed rgba(255, 63, 180, 0.5);
    outline-offset: -2px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: rgba(255, 255, 255, 0.6);

  p {
    margin: 0;
  }

  .hint {
    font-size: 12px;
    margin-top: 8px;
  }
}

.checkpoint-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #22c55e;
  pointer-events: none;
  z-index: 49;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -5px;
    width: 12px;
    height: 12px;
    background: #22c55e;
    clip-path: polygon(50% 100%, 0 0, 100% 0);
  }
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: #ef4444;
  pointer-events: none;
  z-index: 50;
  will-change: transform;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -5px;
    width: 12px;
    height: 12px;
    background: #ef4444;
    clip-path: polygon(50% 100%, 0 0, 100% 0);
  }
}

.readonly-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(0, 100, 160, 0.15);
  border-bottom: 1px solid rgba(0, 140, 220, 0.3);
  gap: 12px;
  flex-wrap: wrap;
}

.readonly-banner-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);

  i {
    color: #60a5fa;
  }

  strong {
    color: #93c5fd;
  }
}

.readonly-banner-actions {
  display: flex;
  gap: 8px;
}

.banner-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.banner-btn-primary {
  background: rgba(0, 120, 200, 0.3);
  border-color: rgba(0, 160, 255, 0.5);
  color: #93c5fd;

  &:hover {
    background: rgba(0, 140, 220, 0.4);
    border-color: #60a5fa;
    color: #bfdbfe;
  }
}

.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-card {
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 12px;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 280px;
}

.export-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border-secondary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.export-title {
  color: var(--color-white);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.export-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.export-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.export-percent {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin: 0;
}

.voice-warning-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d0f20;
  border: 1px solid var(--color-error);
  color: var(--color-white);
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 420px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 10000;

  i {
    color: var(--color-error);
  }
}
</style>
