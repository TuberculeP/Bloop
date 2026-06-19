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
import { useRouter } from "vue-router";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useTrackAudioStore } from "../../../stores/trackAudioStore";
import { useProjectStore } from "../../../stores/projectStore";
import { useDawLoadingStore } from "../../../stores/dawLoadingStore";
import { useAudioBusStore } from "../../../stores/audioBusStore";
import { useAudioLibraryStore } from "../../../stores/audioLibraryStore";
import type {
  Track,
  InstrumentType,
  MidiNote,
  AudioClip,
  NoteName,
} from "../../../lib/utils/types";
import { getAutomationValueAt } from "../../../lib/audio/automation";
import { getDefaultConfigForType } from "../../../lib/audio/instrumentFactory";
import TimelineRuler from "./TimelineRuler.vue";
import TrackRow from "./TrackRow.vue";
import AddTrackButton from "./AddTrackButton.vue";
import InstrumentSettings from "../instruments/InstrumentSettings.vue";

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
const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();
const projectStore = useProjectStore();
const dawLoadingStore = useDawLoadingStore();
const audioBusStore = useAudioBusStore();
const audioLibraryStore = useAudioLibraryStore();

const { isReadOnly, currentProjectOwner } = storeToRefs(projectStore);

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
const showAudioLibrary = inject<Ref<boolean>>("showAudioLibrary", ref(false));

const isEditingProjectName = ref(false);
const editedProjectName = ref("");
const projectNameInputRef = ref<HTMLInputElement | null>(null);

const sortedTracks = computed(() => timelineStore.sortedTracks);

const TRACK_HEADER_WIDTH = 180;
const TRAILING_COLS = 16;

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
const mediaRecorderRef = ref<MediaRecorder | null>(null);
const recordedChunks: Blob[] = [];

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
  mediaRecorderRef.value?.stop();
};

const startExport = async () => {
  await audioBusStore.ensureAudioContextResumed();
  isExporting.value = true;
  isManualExport.value = true;
  exportProgress.value = 0;
  recordedChunks.length = 0;

  const stream = audioBusStore.createCaptureStream();
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  recorder.onstop = () => {
    const ext = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
    const blob = new Blob(recordedChunks, { type: recorder.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${timelineStore.project.name || "projet"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    isExporting.value = false;
    isManualExport.value = false;
    if (props.exportMode) router.push({ name: "app-main" });
  };

  recorder.start();
  mediaRecorderRef.value = recorder;

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
  }

  applyAutomationAtPosition(newPosition);

  animationFrameId.value = requestAnimationFrame(animate);
};

const startPlayback = () => {
  if (isPlaying.value) return;
  audioLibraryStore.stopPreview();

  currentPosition.value = checkpointPosition.value;
  isPlaying.value = true;
  playbackStartTime.value = performance.now();

  triggerNotesAtPosition(currentPosition.value);
  playClipsAtPosition(currentPosition.value);

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

const handleKeydown = (event: KeyboardEvent) => {
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
    <div class="timeline-header">
      <div class="header-left">
        <button
          class="header-btn back-btn"
          @click="handleBackToProjects"
          title="Retour aux projets"
        >
          <i class="fas fa-arrow-left"></i>
        </button>
        <AddTrackButton @add-track="handleAddTrack" />
        <button
          class="header-btn library-btn"
          :class="{ active: showAudioLibrary }"
          @click="showAudioLibrary = !showAudioLibrary"
          title="Audio Library"
        >
          <i class="fas fa-volume-down"></i>
        </button>
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
        </div>
        <div class="position-display">
          {{ Math.floor(currentPosition / 4) + 1 }}:{{
            (Math.floor(currentPosition) % 4) + 1
          }}
        </div>
      </div>
      <div class="header-right">
        <span v-if="saveMessage" :class="['save-message', saveMessage.type]">
          {{ saveMessage.text }}
        </span>
        <div class="save-indicator-group">
          <span
            v-if="projectStore.hasUnsavedChanges"
            class="unsaved-indicator"
            title="Changements non sauvegardés"
          >
            ●
          </span>
          <button
            class="header-btn save-btn"
            :class="{
              saving: isSaving,
              'has-changes': projectStore.hasUnsavedChanges,
            }"
            @click="handleSaveProject"
            :disabled="isSaving || isReadOnly"
            :title="
              isReadOnly
                ? 'Projet en lecture seule'
                : projectStore.hasUnsavedChanges
                  ? 'Sauvegarder les changements'
                  : 'Projet sauvegardé'
            "
          >
            {{ isSaving ? "..." : "Sauvegarder" }}
          </button>
          <button
            class="header-btn export-btn"
            @click="startExport"
            :disabled="isExporting"
            title="Exporter en audio"
          >
            Exporter
            <i class="fas fa-download"></i>
          </button>
        </div>
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

        <div class="tracks-container">
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
</style>
