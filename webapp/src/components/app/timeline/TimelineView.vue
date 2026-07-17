<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  inject,
  watch,
  nextTick,
  type Ref,
} from "vue";
import { storeToRefs } from "pinia";
import { vOnClickOutside } from "@vueuse/components";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useProjectStore } from "../../../stores/projectStore";
import type {
  Track,
  InstrumentType,
  MidiNote,
  NoteName,
} from "../../../lib/utils/types";
import { getDefaultConfigForType } from "../../../lib/audio/instrumentFactory";
import { useTimelinePlaybackEngine } from "../../../composables/timelineView/useTimelinePlaybackEngine";
import { useTimelineExport } from "../../../composables/timelineView/useTimelineExport";
import { useTimelineVoiceRecording } from "../../../composables/timelineView/useTimelineVoiceRecording";
import { useTimelineMidiRecording } from "../../../composables/timelineView/useTimelineMidiRecording";
import { useTimelineFileDrop } from "../../../composables/timelineView/useTimelineFileDrop";
import { useMidiImport } from "../../../composables/timelineView/useMidiImport";
import { useTimelineProjectMeta } from "../../../composables/timelineView/useTimelineProjectMeta";
import {
  pxPerTick,
  ticksPerBar,
  barBeatFromTick,
  SUBDIVISION_PRESETS,
} from "../../../lib/audio/timeGrid";
import TimelineRuler from "./TimelineRuler.vue";
import TrackRow from "./TrackRow.vue";
import MasterTrackRow from "./MasterTrackRow.vue";
import AddTrackButton from "./AddTrackButton.vue";
import InstrumentSettings from "../instruments/InstrumentSettings.vue";
import MasterSettings from "../instruments/MasterSettings.vue";
import BaseButton from "../../ui/BaseButton.vue";
import RangeSlider from "../../ui/RangeSlider.vue";
import BaseModal from "../../ui/BaseModal.vue";
import BaseSpinner from "../../ui/BaseSpinner.vue";
import EmptyState from "../../ui/EmptyState.vue";
import FormField from "../../ui/FormField.vue";
import BaseInput from "../../ui/BaseInput.vue";
import { useToast } from "../../../composables/useToast";

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

const timelineStore = useTimelineStore();
const projectStore = useProjectStore();
const toast = useToast();

const { isReadOnly, currentProjectOwner } = storeToRefs(projectStore);

// Densité visuelle inchangée par rapport à l'ancien COL_WIDTH=20px/colonne
// (colonne = 1/16 de temps) : 20 * 4 = 80px par temps, avant application du zoom.
const BASE_PX_PER_BEAT = 80;
const ROW_HEIGHT = 75;
const TRACK_HEADER_WIDTH = 180;
const DENOMINATOR_OPTIONS = [1, 2, 4, 8, 16, 32];
const ZOOM_STEP_FACTOR = 1.25;
// zoomWheelSpeed (réglage utilisateur, 1-20) est multiplié par cette unité
// pour obtenir l'exposant réellement appliqué au delta de la molette/pincement.
const ZOOM_WHEEL_SPEED_UNIT = 0.001;

const colWidth = computed(() =>
  pxPerTick(BASE_PX_PER_BEAT * timelineStore.zoomLevel),
);

const scrollLeft = ref(0);
const scrollContainerRef = ref<HTMLElement | null>(null);
// Largeur visible de .timeline-scroll (hors header 180px), utilisée par le
// piano roll pour virtualiser son canvas (ne rendre que la tranche visible).
// Un ResizeObserver est nécessaire plutôt que window.resize seul : le
// panneau audiothèque redimensionnable au drag change cette largeur sans
// déclencher de resize de la fenêtre.
const viewportWidth = ref(0);
let scrollContainerResizeObserver: ResizeObserver | null = null;

const settingsTrack = ref<Track | null>(null);
const showSettings = ref(false);
const showMasterSettings = ref(false);
const showAudioLibrary = inject<Ref<boolean>>("showAudioLibrary", ref(false));

const sortedTracks = computed(() => timelineStore.sortedTracks);

const ceilToBar = (ticks: number, barLength: number): number =>
  Math.ceil(Math.max(0, ticks) / barLength) * barLength;

// Marge d'avance au-delà du bord de scroll visible : permet un scroll
// horizontal quasi-infini sans jamais matérialiser une timeline gigantesque
// en dur (la grille suit le scroll par paliers d'une mesure).
const SCROLL_AHEAD_MARGIN_BARS = 16;

const displayCols = computed(() => {
  const barLength = ticksPerBar(timelineStore.timeSignature);

  // Contenu existant : dernière note/clip + 1 mesure de marge.
  let lastEnd = 0;
  for (const track of timelineStore.tracks) {
    for (const note of track.notes) {
      lastEnd = Math.max(lastEnd, note.x + note.w);
    }
    for (const clip of track.clips ?? []) {
      lastEnd = Math.max(lastEnd, clip.x + clip.w);
    }
  }
  const contentCols = ceilToBar(lastEnd, barLength) + barLength;

  // Remplit le viewport visible au zoom courant même sans contenu, pour
  // éviter que la grille s'arrête avant le bord de l'écran en dézoomant.
  const viewportTicks = viewportWidth.value / colWidth.value;
  const viewportFillCols = ceilToBar(viewportTicks, barLength) + barLength;

  // Scroll quasi-infini : garde toujours quelques mesures d'avance au-delà
  // du bord de scroll actuellement visible.
  const scrollAheadTicks =
    (scrollLeft.value + viewportWidth.value) / colWidth.value;
  const scrollAheadCols =
    ceilToBar(scrollAheadTicks, barLength) +
    SCROLL_AHEAD_MARGIN_BARS * barLength;

  const minCols = Math.max(contentCols, viewportFillCols, scrollAheadCols);
  return Math.max(timelineStore.project.cols, minCols);
});

const timeSignatureNumerator = computed({
  get: () => timelineStore.timeSignature.numerator,
  set: (value: number) => {
    timelineStore.timeSignature = {
      ...timelineStore.timeSignature,
      numerator: value,
    };
  },
});

const timeSignatureDenominator = computed({
  get: () => timelineStore.timeSignature.denominator,
  set: (value: number) => {
    timelineStore.timeSignature = {
      ...timelineStore.timeSignature,
      denominator: value,
    };
  },
});

const exportModeProp = computed(() => props.exportMode);

// Le playback engine, l'export et l'enregistrement voix dépendent l'un de l'autre
// (l'export doit interrompre la boucle de playback, arrêter le playback doit
// finaliser un enregistrement en cours) : on casse le cycle avec ces deux
// callbacks, câblés dès que les 3 composables existent.
let exportFeature!: ReturnType<typeof useTimelineExport>;
let voiceRecording!: ReturnType<typeof useTimelineVoiceRecording>;
let midiRecording!: ReturnType<typeof useTimelineMidiRecording>;

const onLoopEnd = () => {
  if (props.exportMode || exportFeature.isManualExport.value) {
    exportFeature.finishExport();
    return true;
  }
  return false;
};

const onStop = () => {
  if (voiceRecording.isRecordingVoice.value) {
    voiceRecording.finishVoiceRecording();
  }
  midiRecording.finishMidiRecording();
};

const playback = useTimelinePlaybackEngine(
  emit,
  () => colWidth.value,
  TRACK_HEADER_WIDTH,
  onLoopEnd,
  onStop,
);
const {
  isPlaying,
  currentPosition,
  cursorStyle,
  checkpointStyle,
  isCountingIn,
  countInBeatsRemaining,
  startPlayback,
  startWithCountIn,
  cancelCountIn,
  stopPlayback,
  setCheckpoint,
} = playback;

const displayBarBeat = computed(() =>
  barBeatFromTick(currentPosition.value, timelineStore.timeSignature),
);

exportFeature = useTimelineExport(playback, exportModeProp);
const {
  isExporting,
  exportProgress,
  showExportModal,
  exportFormat,
  openExportModal,
  cancelExportModal,
  confirmExport,
} = exportFeature;

voiceRecording = useTimelineVoiceRecording(playback);
const {
  voiceRecorderSupported,
  voiceLevel,
  voiceRecorderError,
  voiceDevices,
  selectedMicId,
  isRecordingVoice,
  showMicPicker,
  voiceRecordedTime,
  toggleVoiceRecording,
  toggleMicPicker,
  selectMic,
  closeMicPicker,
} = voiceRecording;

midiRecording = useTimelineMidiRecording(playback);
const {
  midiSupported,
  midiInputs,
  selectedMidiInputId,
  isRecordingMidi,
  midiError,
  toggleMidiRecording,
  showMidiPicker,
  toggleMidiPicker,
  selectMidiInput,
  closeMidiPicker,
} = midiRecording;

// Mode du bouton record généralisé : quoi capturer au clic droit. État de
// session (comme selectedMicId), pas persisté au projet.
const recordMode = ref<"audio" | "midi" | "both">("audio");
const isRecording = computed(
  () => isRecordingVoice.value || isRecordingMidi.value,
);

// Armement de l'enregistrement : un simple toggle, indépendant du transport.
// Le bouton record n'enclenche jamais lui-même le play/l'enregistrement —
// c'est togglePlayback (Play ou Espace) qui, une fois armé, lance le décompte
// puis l'enregistrement. Ça permet d'enchaîner plusieurs prises juste avec
// Espace (armé une fois, start/stop répétés), et d'annuler le décompte avec
// Espace/Play sans avoir à re-cliquer sur le bouton record.
const recordArmed = ref(false);
const toggleRecordArmed = () => {
  recordArmed.value = !recordArmed.value;
};

const togglePlayback = () => {
  if (isPlaying.value) {
    stopPlayback();
    return;
  }
  if (isCountingIn.value) {
    cancelCountIn();
    return;
  }
  if (!recordArmed.value) {
    startPlayback();
    return;
  }
  startWithCountIn(async () => {
    if (recordMode.value !== "midi") await toggleVoiceRecording();
    if (recordMode.value !== "audio") toggleMidiRecording();
  });
};

const recordModeMenuOpen = ref(false);
const recordModeMenuPosition = ref({ x: 0, y: 0 });
const RECORD_MODE_ITEMS: { value: typeof recordMode.value; label: string }[] = [
  { value: "audio", label: "Audio" },
  { value: "midi", label: "MIDI" },
  { value: "both", label: "Audio + MIDI" },
];

const openRecordModeMenu = (event: MouseEvent) => {
  event.preventDefault();
  recordModeMenuPosition.value = { x: event.clientX, y: event.clientY };
  recordModeMenuOpen.value = true;
};

const closeRecordModeMenu = () => {
  recordModeMenuOpen.value = false;
};

const selectRecordMode = (mode: typeof recordMode.value) => {
  recordMode.value = mode;
  closeRecordModeMenu();
};

const {
  isDragOverTimeline,
  tracksContainerRef,
  handleTracksContainerDragOver,
  handleTracksContainerDragLeave,
  handleTracksContainerDrop,
} = useTimelineFileDrop(() => colWidth.value, TRACK_HEADER_WIDTH);

const {
  midiFileInputRef,
  showMidiTrackPickerModal,
  midiTrackCandidates,
  selectedMidiCandidateIndex,
  openMidiImportPicker,
  handleMidiFileSelected,
  confirmMidiTrackSelection,
  cancelMidiTrackSelection,
} = useMidiImport();

const handleImportMidiClick = (track: Track) => {
  openMidiImportPicker(track.id);
};

const {
  isCloning,
  isSaving,
  saveMessage,
  isEditingProjectName,
  editedProjectName,
  projectNameInputRef,
  startEditProjectName,
  saveProjectName,
  cancelEditProjectName,
  handleSaveProject,
  handleBackToProjects,
  handleResetReadOnly,
  handleCloneProject,
} = useTimelineProjectMeta();

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

const pendingDeleteTrack = ref<Track | null>(null);

const handleDeleteTrack = (track: Track) => {
  pendingDeleteTrack.value = track;
};

const cancelDeleteTrack = () => {
  pendingDeleteTrack.value = null;
};

const confirmDeleteTrack = () => {
  if (!pendingDeleteTrack.value) return;
  timelineStore.deleteTrack(pendingDeleteTrack.value.id);
  pendingDeleteTrack.value = null;
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

const renamingTrack = ref<Track | null>(null);
const renameValue = ref("");

const handleRenameTrack = (track: Track) => {
  renamingTrack.value = track;
  renameValue.value = track.name;
};

const cancelRenameTrack = () => {
  renamingTrack.value = null;
};

const confirmRenameTrack = () => {
  if (!renamingTrack.value) return;
  const newName = renameValue.value.trim();
  if (newName && newName !== renamingTrack.value.name) {
    timelineStore.renameTrack(renamingTrack.value.id, newName);
  }
  renamingTrack.value = null;
};

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollLeft.value = target.scrollLeft;
};

const handleGoToStart = () => {
  setCheckpoint(0);
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollLeft = 0;
  }
};

const zoomPercent = computed(() => Math.round(timelineStore.zoomLevel * 100));

const setZoom = (value: number) => {
  timelineStore.setZoomLevel(value);
};

const zoomIn = () => setZoom(timelineStore.zoomLevel * ZOOM_STEP_FACTOR);
const zoomOut = () => setZoom(timelineStore.zoomLevel / ZOOM_STEP_FACTOR);
const resetZoom = () => setZoom(1);

const showZoomSettings = ref(false);
const closeZoomSettings = () => {
  showZoomSettings.value = false;
};

// Zoom centré sur la souris (Ctrl+molette, inclut le pinch trackpad qui met
// ctrlKey=true dans Chrome/Firefox) : on garde le tick sous le curseur stable
// en recalculant scrollLeft après que colWidth ait changé.
const handleWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return;
  event.preventDefault();

  const container = scrollContainerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const mouseOffsetInContainer = event.clientX - rect.left;
  const tickUnderMouse =
    (container.scrollLeft + mouseOffsetInContainer - TRACK_HEADER_WIDTH) /
    colWidth.value;

  const sensitivity = timelineStore.zoomWheelSpeed * ZOOM_WHEEL_SPEED_UNIT;
  const factor = Math.exp(-event.deltaY * sensitivity);
  setZoom(timelineStore.zoomLevel * factor);

  nextTick(() => {
    container.scrollLeft =
      tickUnderMouse * colWidth.value +
      TRACK_HEADER_WIDTH -
      mouseOffsetInContainer;
  });
};

watch(voiceRecorderError, (message) => {
  if (message) toast.error(message);
});

watch(midiError, (message) => {
  if (message) toast.error(message);
});

// Types d'<input> où Espace insère un caractère réel (édition de texte
// libre) : ce sont les seuls à devoir bloquer le raccourci global. Les autres
// types (number, range, radio, checkbox, color, date...) ignorent Espace
// nativement (aucun caractère inséré) — le garder comme "typing target" ne
// ferait que rendre Espace silencieusement inopérant sur ces champs.
const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "tel",
  "email",
  "url",
  "password",
]);

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(target.type);
  }
  return target.tagName === "TEXTAREA" || target.isContentEditable;
};

// Contrôles dont l'activation native par Espace (clic de bouton, cochage de
// case, ouverture de <select>, incrément de slider/number) ne doit jamais
// l'emporter sur le Play/Stop global — Espace doit toujours atteindre
// togglePlayback(), jamais réactiver l'un de ces éléments.
const isSpaceActivatableControl = (target: Element | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLButtonElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !TEXT_INPUT_TYPES.has(target.type);
  }
  return false;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (isTypingTarget(event.target)) return;

  if (event.code === "Space") {
    event.preventDefault();
    // Si un bouton/select/input non-texte a le focus (navigation Tab, ou
    // clic pour les inputs/selects — le fix mousedown ci-dessous ne
    // s'applique qu'aux <button>), on le blur pour garantir que Espace ne
    // l'active jamais. Entrée reste intacte pour l'activer normalement.
    if (isSpaceActivatableControl(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    togglePlayback();
  } else if (event.code === "Escape") {
    timelineStore.collapseTrack();
  }
};

// Empêche un <button> de conserver le focus navigateur après un clic souris
// (sans empêcher le click lui-même, qui se déclenche toujours au mouseup) :
// technique standard (Radix UI/MUI) via preventDefault() sur mousedown, la
// phase où le navigateur assigne normalement le focus. Nécessaire pour que
// Espace, juste après un clic sur mute/solo/play/zoom/etc., ne fasse QUE
// togglePlayback() et ne réactive jamais accidentellement le bouton cliqué.
// window (comme le listener keydown) plutôt qu'un élément racine du
// template : TrackHeader.vue téléporte son menu contextuel dans <body> via
// <Teleport to="body">, hors du sous-arbre DOM de TimelineView.
const preventButtonFocusOnMouseDown = (event: MouseEvent) => {
  if (!(event.target instanceof HTMLElement)) return;
  if (event.target.closest("button")) {
    event.preventDefault();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("mousedown", preventButtonFocusOnMouseDown, {
    capture: true,
  });

  if (scrollContainerRef.value) {
    viewportWidth.value =
      scrollContainerRef.value.clientWidth - TRACK_HEADER_WIDTH;
    scrollContainerResizeObserver = new ResizeObserver(() => {
      if (!scrollContainerRef.value) return;
      viewportWidth.value =
        scrollContainerRef.value.clientWidth - TRACK_HEADER_WIDTH;
    });
    scrollContainerResizeObserver.observe(scrollContainerRef.value);
  }
});

onBeforeUnmount(() => {
  stopPlayback();
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("mousedown", preventButtonFocusOnMouseDown, {
    capture: true,
  });
  scrollContainerResizeObserver?.disconnect();
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
        <BaseSpinner size="large" color="primary" />
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

    <BaseModal
      :model-value="showExportModal"
      @update:model-value="cancelExportModal"
    >
      <template #header>
        <h3>Exporter le projet</h3>
      </template>
      <p class="export-modal-description">
        Choisissez le format du fichier audio à générer.
      </p>
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
      <template #footer>
        <BaseButton variant="secondary" @click="cancelExportModal">
          Annuler
        </BaseButton>
        <BaseButton variant="accent" @click="confirmExport">
          Exporter
        </BaseButton>
      </template>
    </BaseModal>

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
            @click="handleGoToStart"
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
              :class="{
                armed: recordArmed,
                recording: isRecording,
                'counting-in': isCountingIn,
              }"
              @click="toggleRecordArmed"
              @contextmenu.prevent="openRecordModeMenu"
              :title="
                recordArmed
                  ? 'Désarmer l\'enregistrement'
                  : 'Armer l\'enregistrement (Espace ou Play pour lancer, clic droit : choisir audio/MIDI)'
              "
            >
              <i class="fas fa-circle"></i>
            </button>
            <button
              v-if="recordMode !== 'midi'"
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

          <div class="midi-control" v-on-click-outside="closeMidiPicker">
            <button
              class="midi-status-toggle"
              :class="{ connected: midiInputs.length > 0 }"
              :disabled="!midiSupported"
              @click.stop="toggleMidiPicker"
              :title="
                !midiSupported
                  ? 'Clavier MIDI non supporté par ce navigateur'
                  : midiInputs.length === 0
                    ? 'Aucun clavier MIDI détecté'
                    : 'Clavier MIDI connecté'
              "
            >
              <i class="fas fa-keyboard"></i>
            </button>

            <Transition name="fade">
              <div v-if="showMidiPicker" class="midi-picker-dropdown">
                <div class="midi-picker-header">Clavier MIDI</div>
                <button
                  v-for="input in midiInputs"
                  :key="input.id"
                  class="midi-picker-option"
                  :class="{ active: input.id === selectedMidiInputId }"
                  @click="selectMidiInput(input.id)"
                >
                  {{ input.name || "Clavier MIDI" }}
                </button>
                <div v-if="midiInputs.length === 0" class="midi-picker-empty">
                  Aucun clavier MIDI détecté
                </div>
              </div>
            </Transition>
          </div>

          <div v-if="isCountingIn" class="record-indicator counting-in">
            <span class="record-indicator-dot"></span>
            {{ countInBeatsRemaining }}
          </div>
          <div v-else-if="isRecording" class="record-indicator">
            <span
              v-if="isRecordingVoice"
              class="record-indicator-dot"
              :style="{ transform: `scale(${1 + voiceLevel * 0.6})` }"
            ></span>
            <span v-else class="record-indicator-dot"></span>
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
        <div class="time-signature-control">
          <label>Sign.:</label>
          <input
            type="number"
            v-model.number="timeSignatureNumerator"
            min="1"
            max="32"
            step="1"
          />
          <span>/</span>
          <select v-model.number="timeSignatureDenominator">
            <option v-for="d in DENOMINATOR_OPTIONS" :key="d" :value="d">
              {{ d }}
            </option>
          </select>
        </div>
        <div class="subdivision-control">
          <label>Grille:</label>
          <select v-model.number="timelineStore.subdivision">
            <option v-for="s in SUBDIVISION_PRESETS" :key="s" :value="s">
              1/{{ s }}
            </option>
          </select>
        </div>
        <div class="position-display">
          {{ displayBarBeat.bar }}:{{ displayBarBeat.beat }}
        </div>
        <div class="zoom-control">
          <button class="zoom-btn" @click="zoomOut" title="Dézoomer">
            <i class="fas fa-minus"></i>
          </button>
          <span
            class="zoom-percent"
            @click="resetZoom"
            title="Réinitialiser le zoom (100%)"
          >
            {{ zoomPercent }}%
          </span>
          <button class="zoom-btn" @click="zoomIn" title="Zoomer">
            <i class="fas fa-plus"></i>
          </button>
          <div class="zoom-settings" v-on-click-outside="closeZoomSettings">
            <button
              class="zoom-btn"
              @click="showZoomSettings = !showZoomSettings"
              title="Réglages du zoom"
            >
              <i class="fas fa-cog"></i>
            </button>
            <Transition name="fade">
              <div v-if="showZoomSettings" class="zoom-settings-dropdown">
                <div class="zoom-settings-header">Zoom</div>
                <div class="zoom-settings-row">
                  <label>Sensibilité molette / pincement</label>
                  <RangeSlider
                    :model-value="timelineStore.zoomWheelSpeed"
                    :min="timelineStore.ZOOM_WHEEL_SPEED_MIN"
                    :max="timelineStore.ZOOM_WHEEL_SPEED_MAX"
                    :step="1"
                    thumb-size="small"
                    @update:model-value="timelineStore.setZoomWheelSpeed"
                  />
                </div>
              </div>
            </Transition>
          </div>
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
        @wheel="handleWheel"
      >
        <TimelineRuler
          :cols="displayCols"
          :col-width="colWidth"
          :scroll-left="scrollLeft"
          :viewport-width="viewportWidth"
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
            :col-width="colWidth"
            :scroll-left="scrollLeft"
            :viewport-width="viewportWidth"
            @open-settings="showMasterSettings = true"
          />

          <TrackRow
            v-for="track in sortedTracks"
            :key="track.id"
            :track="track"
            :cols="displayCols"
            :col-width="colWidth"
            :row-height="ROW_HEIGHT"
            :is-expanded="track.id === timelineStore.expandedTrackId"
            :is-active="track.id === timelineStore.activeTrackId"
            :playback-position="currentPosition"
            :is-playing="isPlaying"
            :scroll-left="scrollLeft"
            :viewport-width="viewportWidth"
            @toggle-mute="handleToggleMute"
            @toggle-solo="handleToggleSolo"
            @select-track="handleSelectTrack"
            @rename-track="handleRenameTrack"
            @delete-track="handleDeleteTrack"
            @open-settings="handleOpenSettings"
            @toggle-expand="handleToggleExpand"
            @import-midi="handleImportMidiClick"
          />

          <EmptyState
            v-if="sortedTracks.length === 0"
            title="Aucune piste"
            message='Cliquez sur "Ajouter" pour créer votre première piste'
          />
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

    <BaseModal
      :model-value="pendingDeleteTrack !== null"
      @update:model-value="cancelDeleteTrack"
    >
      <template #header>
        <h3>Supprimer la piste ?</h3>
      </template>
      <p class="export-modal-description">
        Supprimer la piste "{{ pendingDeleteTrack?.name }}" ?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="cancelDeleteTrack">
          Annuler
        </BaseButton>
        <BaseButton variant="danger" @click="confirmDeleteTrack">
          Supprimer
        </BaseButton>
      </template>
    </BaseModal>

    <BaseModal
      :model-value="renamingTrack !== null"
      @update:model-value="cancelRenameTrack"
    >
      <template #header>
        <h3>Renommer la piste</h3>
      </template>
      <FormField label="Nom">
        <BaseInput
          v-model="renameValue"
          required
          @keydown.enter="confirmRenameTrack"
        />
      </FormField>
      <template #footer>
        <BaseButton variant="secondary" @click="cancelRenameTrack">
          Annuler
        </BaseButton>
        <BaseButton variant="accent2" @click="confirmRenameTrack">
          Renommer
        </BaseButton>
      </template>
    </BaseModal>

    <input
      ref="midiFileInputRef"
      type="file"
      accept=".mid,.midi,audio/midi"
      class="hidden-input"
      @change="handleMidiFileSelected"
    />

    <BaseModal
      :model-value="showMidiTrackPickerModal"
      @update:model-value="cancelMidiTrackSelection"
    >
      <template #header>
        <h3>Choisir la piste à importer</h3>
      </template>
      <p class="export-modal-description">
        Ce fichier MIDI contient plusieurs pistes. Choisissez celle à importer
        (elle remplacera les notes existantes de la piste sélectionnée).
      </p>
      <div class="midi-track-options">
        <label
          v-for="candidate in midiTrackCandidates"
          :key="candidate.index"
          class="export-format-option"
          :class="{ active: selectedMidiCandidateIndex === candidate.index }"
        >
          <input
            v-model="selectedMidiCandidateIndex"
            type="radio"
            :value="candidate.index"
          />
          {{ candidate.label
          }}{{
            candidate.instrumentName !== candidate.label
              ? ` — ${candidate.instrumentName}`
              : ""
          }}
          ({{ candidate.noteCount }} notes)
        </label>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="cancelMidiTrackSelection">
          Annuler
        </BaseButton>
        <BaseButton variant="accent" @click="confirmMidiTrackSelection">
          Importer
        </BaseButton>
      </template>
    </BaseModal>
  </div>

  <!-- Menu de mode d'enregistrement (audio/MIDI/les deux), via Teleport -->
  <Teleport to="body">
    <div
      v-if="recordModeMenuOpen"
      class="menu-overlay"
      @click="closeRecordModeMenu"
      @contextmenu.prevent="closeRecordModeMenu"
    >
      <ul
        class="dropdown"
        :style="{
          top: recordModeMenuPosition.y + 'px',
          left: recordModeMenuPosition.x + 'px',
        }"
        @click.stop
      >
        <li
          v-for="item in RECORD_MODE_ITEMS"
          :key="item.value"
          class="dropdown-item"
          :class="{ active: recordMode === item.value }"
          @click="selectRecordMode(item.value)"
        >
          <i
            :class="recordMode === item.value ? 'fas fa-check' : 'fas fa-fw'"
          ></i>
          {{ item.label }}
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.timeline-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg-secondary-dark);
  border-bottom: 1px solid var(--color-border-secondary);
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
  border: 1px solid var(--color-border-secondary);
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
    border-color: var(--color-accent2);
  }
}

.save-indicator-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unsaved-indicator {
  color: var(--color-audio-clip-selected);
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
    background: var(--color-accent3-hover);
  }

  &.saving {
    opacity: 0.7;
  }

  &.has-changes {
    border-color: var(--color-audio-clip-selected);
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
  border-radius: var(--radius-sm);

  &.success {
    color: var(--color-status-success);
  }

  &.error {
    color: var(--color-status-error);
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
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-white);
  }
}

.project-name-input {
  font-size: 14px;
  color: var(--color-white);
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-accent2);
  border-radius: var(--radius-sm);
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
  color: var(--color-white);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-accent3-hover);
  }

  &.play-btn {
    background: var(--color-accent2);

    &:hover {
      background: var(--color-accent2-hover);
    }

    &.playing {
      background: var(--color-accent2-active);
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
    color: var(--color-status-error);
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    background: var(--color-accent3-hover);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.armed {
    background: var(--color-status-error);

    i {
      /* stylelint-disable-next-line color-no-hex -- blanc pur pour contraste maximal sur fond saturé */
      color: #fff;
    }
  }

  &.recording {
    background: var(--color-status-error);
    animation: record-pulse 1.4s ease-in-out infinite;

    i {
      /* stylelint-disable-next-line color-no-hex -- blanc pur pour contraste maximal sur fond saturé */
      color: #fff;
    }
  }

  &.counting-in {
    background: var(--color-warning);
    animation: count-in-pulse 1s ease-in-out infinite;

    i {
      color: var(--color-black);
    }
  }
}

@keyframes record-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--color-status-error-rgb), 0.5);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(var(--color-status-error-rgb), 0);
  }
}

@keyframes count-in-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
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
    color: var(--color-white);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.mic-picker-dropdown,
.zoom-settings-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 100;
}

.mic-picker-dropdown {
  left: 0;
  min-width: 220px;
}

.mic-picker-header,
.zoom-settings-header {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  background: var(--color-bg-primary-dark);
  border-bottom: 1px solid var(--color-border-secondary);
}

.mic-picker-option {
  width: 100%;
  display: block;
  text-align: left;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--color-bg-daw-active);
  }

  &.active {
    color: var(--color-accent2);
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
  background: rgba(var(--color-status-error-rgb), 0.15);
  color: var(--color-status-error);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;

  &.counting-in {
    background: var(--color-warning);
    color: var(--color-black);

    .record-indicator-dot {
      background: var(--color-black);
    }
  }
}

.record-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-status-error);
  transition: transform 0.05s linear;
}

.midi-control {
  position: relative;
  display: flex;
  align-items: center;
}

.midi-status-toggle {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    color: var(--color-white);
  }

  &.connected {
    color: var(--color-status-success);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.midi-picker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 100;
}

.midi-picker-header {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  background: var(--color-bg-primary-dark);
  border-bottom: 1px solid var(--color-border-secondary);
}

.midi-picker-option {
  width: 100%;
  display: block;
  text-align: left;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--color-bg-daw-active);
  }

  &.active {
    color: var(--color-accent2);
    font-weight: 600;
  }
}

.midi-picker-empty {
  padding: 10px 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.dropdown {
  position: fixed;
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-accent2);
  border-radius: var(--radius-sm);
  min-width: 150px;
  z-index: 1000;
  overflow: hidden;
  list-style: none;
  padding: 4px 0;
  margin: 0;
}

.dropdown-item {
  padding: 8px 14px;
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background: var(--color-bg-daw-active);
  }

  &.active {
    color: var(--color-accent2);
    font-weight: 600;
  }
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
    border: 1px solid var(--color-border-secondary);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-secondary-dark);
    color: var(--color-white);
    font-size: 14px;
    text-align: center;
    color-scheme: dark;

    &:focus {
      outline: none;
      border-color: var(--color-accent2);
    }
  }
}

.time-signature-control,
.subdivision-control {
  display: flex;
  align-items: center;
  gap: 6px;

  label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  input,
  select {
    padding: 6px 8px;
    border: 1px solid var(--color-border-secondary);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-secondary-dark);
    color: var(--color-white);
    font-size: 14px;
    text-align: center;
    color-scheme: dark;

    &:focus {
      outline: none;
      border-color: var(--color-accent2);
    }
  }

  input {
    width: 44px;
  }
}

.metronome-toggle,
.zoom-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--color-accent2);
    color: var(--color-white);
  }
}

.metronome-toggle.active {
  background: var(--color-accent2);
  border-color: var(--color-accent2);
  color: var(--color-white);
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.zoom-percent {
  min-width: 44px;
  padding: 6px 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: var(--radius-sm);

  &:hover {
    color: var(--color-white);
    background: rgba(255, 255, 255, 0.1);
  }
}

.zoom-settings {
  position: relative;
}

.zoom-settings-dropdown {
  right: 0;
  min-width: 260px;
}

.zoom-settings-row {
  padding: 12px 14px;

  label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 8px;
  }
}

.export-modal-description {
  color: var(--color-white-light);
  opacity: 0.75;
  margin: 0 0 24px;
  font-size: 0.95rem;
  line-height: 1.5;
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
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  color: var(--color-white);
  font-size: 14px;
  cursor: pointer;

  &.active {
    border-color: var(--color-accent2);
    background-color: rgba(255, 63, 180, 0.1);
  }

  input {
    accent-color: var(--color-accent2);
  }
}

.midi-track-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;

  .export-format-option {
    justify-content: flex-start;
  }
}

.hidden-input {
  display: none;
}

.position-display {
  font-family: monospace;
  font-size: 16px;
  min-width: 60px;
  text-align: center;
  padding: 6px 12px;
  background-color: var(--color-bg-secondary-dark);
  color: var(--color-white);
  border-radius: var(--radius-sm);
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
  background: var(--color-bg-primary-dark);
}

.tracks-container {
  position: relative;
  min-height: calc(100% - 30px);
  background: var(--color-bg-primary-dark);
  transition: background 0.15s;

  &.drag-over {
    background: rgba(255, 63, 180, 0.08);
    outline: 2px dashed rgba(255, 63, 180, 0.5);
    outline-offset: -2px;
  }
}

.checkpoint-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-status-success);
  pointer-events: none;
  z-index: 49;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -5px;
    width: 12px;
    height: 12px;
    background: var(--color-status-success);
    clip-path: polygon(50% 100%, 0 0, 100% 0);
  }
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--color-status-error);
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
    background: var(--color-status-error);
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

/* stylelint-disable color-no-hex -- thème bleu "lecture seule", distinct de la charte rose/violette, sans équivalent token */
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
/* stylelint-enable color-no-hex */

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
    /* stylelint-disable-next-line color-no-hex -- blanc pur pour contraste maximal sur fond saturé */
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* stylelint-disable color-no-hex -- thème bleu "lecture seule", distinct de la charte rose/violette, sans équivalent token */
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
/* stylelint-enable color-no-hex */

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
  border-radius: var(--radius-lg);
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 280px;
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

@media (max-width: 1024px) {
  .timeline-header {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .header-center {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}
</style>
