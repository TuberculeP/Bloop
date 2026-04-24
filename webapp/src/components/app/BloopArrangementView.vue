<template>
  <div class="arrangement-container">
    <!-- Sidebar avec la liste des séquences (Picker Panel) -->
    <div class="sequence-picker">
      <div class="picker-header">
        <h3>Patterns</h3>
      </div>
      <div class="picker-list">
        <div
          v-for="sequence in sequencerStore.project.sequences"
          :key="sequence.id"
          class="picker-item"
          :class="{ active: sequencerStore.activeSequence?.id === sequence.id }"
          draggable="true"
          @dragstart="onSequenceDragStart($event, sequence)"
          @dblclick="editSequence(sequence.id)"
        >
          <span class="sequence-name">{{ sequence.name }}</span>
          <span class="sequence-length">{{ sequence.cols }} cols</span>
        </div>
      </div>
      <div class="picker-footer">
        <button @click="createNewSequence" class="btn btn-small btn-primary">
          + Nouveau Pattern
        </button>
      </div>
    </div>

    <!-- Zone principale de l'arrangement -->
    <div class="arrangement-main">
      <!-- Header avec les mesures -->
      <div class="arrangement-header">
        <div class="track-labels-header"></div>
        <div
          class="timeline-header"
          ref="timelineHeaderRef"
          @click="onTimelineHeaderClick"
        >
          <div
            class="timeline-header-inner"
            :style="{ width: `${gridWidth}px` }"
          >
            <div
              v-for="measure in measures"
              :key="measure"
              class="measure-marker"
              :style="{ width: `${measureWidth}px` }"
            >
              {{ measure }}
            </div>
          </div>
        </div>
      </div>

      <!-- Corps de l'arrangement -->
      <div class="arrangement-body">
        <!-- Labels des pistes -->
        <div class="track-labels">
          <div v-for="track in trackCount" :key="track" class="track-label">
            Track {{ track }}
          </div>
        </div>

        <!-- Grille de l'arrangement -->
        <div
          ref="gridRef"
          class="arrangement-grid"
          @scroll="onGridScroll"
          @drop="onDrop"
          @dragover.prevent="onDragOver"
          @dragleave="onDragLeave"
        >
          <!-- Grille de fond -->
          <div class="background-grid" :style="gridStyle">
            <div v-for="track in trackCount" :key="track" class="grid-row">
              <div
                v-for="col in arrangementCols"
                :key="`${track}-${col}`"
                class="grid-cell"
                :class="{ 'beat-marker': (col - 1) % 4 === 0 }"
              ></div>
            </div>
          </div>

          <!-- Clips -->
          <div class="clips-layer" :style="gridStyle">
            <div
              v-for="clip in sequencerStore.arrangementClips"
              :key="clip.id"
              class="arrangement-clip"
              :class="{
                selected: selectedClips.has(clip.id),
                dragging: draggedClipId === clip.id,
                trimming: trimmingClipId === clip.id,
              }"
              :style="getClipStyle(clip)"
              draggable="true"
              @dragstart="onClipDragStart($event, clip)"
              @click="selectClip($event, clip)"
              @dblclick="editClipSequence(clip)"
              @contextmenu.prevent="showClipContextMenu($event, clip)"
            >
              <!-- Poignée de redimensionnement gauche -->
              <div
                class="resize-handle resize-handle-left"
                @mousedown.stop="startResize($event, clip, 'left')"
              ></div>
              <span class="clip-name">{{
                getSequenceName(clip.sequenceId)
              }}</span>
              <div class="clip-notes-preview">
                <div
                  v-for="note in getClipNotesPreview(clip)"
                  :key="note.i"
                  class="preview-note"
                  :style="getNotePreviewStyle(note, clip)"
                ></div>
              </div>
              <!-- Poignée de redimensionnement droite -->
              <div
                class="resize-handle resize-handle-right"
                @mousedown.stop="startResize($event, clip, 'right')"
              ></div>
            </div>
          </div>

          <!-- Curseur de lecture -->
          <div
            v-if="isPlaying || currentPosition > 0"
            class="playback-cursor"
            :style="{
              left: `${(precisePosition / arrangementCols) * gridWidth}px`,
            }"
          ></div>

          <!-- Zone de drop preview -->
          <div
            v-if="dropPreview"
            class="drop-preview"
            :style="getDropPreviewStyle()"
          ></div>
        </div>
      </div>

      <!-- Contrôles -->
      <div class="arrangement-controls">
        <div class="playback-controls">
          <button
            @click="togglePlayback"
            class="btn btn-primary"
            :class="{ 'btn-pause': isPlaying }"
          >
            {{ isPlaying ? "Pause" : "Play" }}
          </button>
          <button @click="stopPlayback" class="btn btn-secondary">Stop</button>
        </div>

        <div class="tempo-control">
          <label>BPM: {{ sequencerStore.arrangementTempo }}</label>
          <input
            type="range"
            min="60"
            max="180"
            :value="sequencerStore.arrangementTempo"
            @input="updateTempo"
            class="tempo-slider"
          />
        </div>

        <div class="position-display">
          <span
            >{{ Math.floor(currentPosition / 4) + 1 }}:{{
              (currentPosition % 4) + 1
            }}</span
          >
        </div>

        <div class="selection-controls">
          <button
            v-if="selectedClips.size > 0"
            @click="deleteSelectedClips"
            class="btn btn-warning"
          >
            Supprimer ({{ selectedClips.size }})
          </button>
          <button
            v-if="selectedClips.size > 0"
            @click="duplicateSelectedClips"
            class="btn btn-secondary"
          >
            Dupliquer
          </button>
        </div>
      </div>
    </div>

    <!-- Menu contextuel -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
    >
      <div class="context-menu-item" @click="duplicateContextClip">
        Dupliquer
      </div>
      <div class="context-menu-item" @click="makeContextClipUnique">
        Rendre unique
      </div>
      <div class="context-menu-item" @click="editContextClipSequence">
        Éditer pattern
      </div>
      <div class="context-menu-item danger" @click="deleteContextClip">
        Supprimer
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSequencerStore } from "../../stores/sequencerStore";
import { useMIDIStore } from "../../stores/MIDIStore";
import type {
  ArrangementClip,
  Sequence,
  MidiNote,
} from "../../lib/utils/types";

// Stores
const sequencerStore = useSequencerStore();
const midiStore = useMIDIStore();

// Événements
const emit = defineEmits<{
  editSequence: [sequenceId: string];
  noteStart: [note: MidiNote, noteName: string, position: number];
  noteEnd: [note: MidiNote, noteName: string, position: number];
}>();

// Refs
const gridRef = ref<HTMLElement | null>(null);
const timelineHeaderRef = ref<HTMLElement | null>(null);

// Configuration
const cellWidth = 20; // Largeur d'une colonne en pixels
const trackHeight = 60; // Hauteur d'une piste en pixels
const trackCount = computed(() => sequencerStore.arrangement.trackCount);
const arrangementCols = computed(() => sequencerStore.arrangement.cols);
const measureWidth = computed(() => cellWidth * 4); // 4 colonnes par mesure
const gridWidth = computed(() => cellWidth * arrangementCols.value);

// État de sélection
const selectedClips = ref<Set<string>>(new Set());

// État de drag & drop
const draggedSequenceId = ref<string | null>(null);
const draggedClipId = ref<string | null>(null);
const dragOffsetX = ref(0); // Offset de la souris par rapport au coin gauche du clip
const dropPreview = ref<{ x: number; y: number; width: number } | null>(null);

// État de trim (couper le clip)
const trimmingClipId = ref<string | null>(null);
const trimDirection = ref<"left" | "right" | null>(null);
const trimStartMouseX = ref(0);
const trimStartOffset = ref(0);
const trimEndOffset = ref(0);

// État de lecture
const isPlaying = ref(false);
const currentPosition = ref(0);
const precisePosition = ref(0);
const playbackStartTime = ref(0);
const playbackAnimationId = ref<number | null>(null);
const activeNotes = ref<Set<string>>(new Set());
const lastNoteCheckPosition = ref(-1);

// Menu contextuel
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  clipId: null as string | null,
});

// Props pour simulation clavier
const enableKeyboardSimulation = ref(true);

// Computed
const measures = computed(() => {
  const result: number[] = [];
  for (let i = 1; i <= arrangementCols.value / 4; i++) {
    result.push(i);
  }
  return result;
});

const gridStyle = computed(() => ({
  width: `${gridWidth.value}px`,
  height: `${trackCount.value * trackHeight}px`,
}));

// Fonctions de drag & drop pour les séquences
const onSequenceDragStart = (event: DragEvent, sequence: Sequence) => {
  draggedSequenceId.value = sequence.id;
  event.dataTransfer?.setData("text/plain", sequence.id);
};

// Fonctions de drag & drop pour les clips
const onClipDragStart = (event: DragEvent, clip: ArrangementClip) => {
  draggedClipId.value = clip.id;
  event.dataTransfer?.setData("text/plain", `clip:${clip.id}`);

  // Calculer l'offset de la souris par rapport au coin gauche du clip
  if (gridRef.value) {
    const rect = gridRef.value.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + gridRef.value.scrollLeft;
    const clipLeftX = clip.x * cellWidth;
    dragOffsetX.value = mouseX - clipLeftX;
  }

  // Sélectionner le clip si pas déjà sélectionné
  if (!selectedClips.value.has(clip.id)) {
    selectedClips.value.clear();
    selectedClips.value.add(clip.id);
  }
};

const onDragOver = (event: DragEvent) => {
  if (!gridRef.value) return;

  const rect = gridRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left + gridRef.value.scrollLeft;
  const y = event.clientY - rect.top + gridRef.value.scrollTop;

  const track = Math.floor(y / trackHeight);

  // Calculer la largeur du preview et la position X
  let width = 64 * cellWidth; // Valeur par défaut
  let previewX: number;

  if (draggedSequenceId.value) {
    // Nouvelle séquence depuis le picker
    const col = Math.floor(x / cellWidth);
    previewX = col * cellWidth;
    const sequence = sequencerStore.getSequenceById(draggedSequenceId.value);
    if (sequence) {
      // Calculer la largeur auto-trimmée
      const { startOffset, endOffset } =
        sequencerStore.calculateAutoTrimOffsets(sequence);
      const trimmedDuration = sequence.cols - startOffset - endOffset;
      width = trimmedDuration * cellWidth;
    }
  } else if (draggedClipId.value) {
    // Clip existant : utiliser l'offset pour maintenir la position de grab
    const adjustedX = x - dragOffsetX.value;
    const col = Math.floor(adjustedX / cellWidth);
    previewX = Math.max(0, col * cellWidth);
    const clip = sequencerStore.arrangementClips.find(
      (c) => c.id === draggedClipId.value,
    );
    if (clip) {
      width = sequencerStore.getClipDuration(clip) * cellWidth;
    }
  } else {
    const col = Math.floor(x / cellWidth);
    previewX = col * cellWidth;
  }

  dropPreview.value = {
    x: previewX,
    y: track * trackHeight,
    width,
  };
};

const onDragLeave = () => {
  dropPreview.value = null;
};

const onDrop = (event: DragEvent) => {
  if (!gridRef.value) return;

  const rect = gridRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left + gridRef.value.scrollLeft;
  const y = event.clientY - rect.top + gridRef.value.scrollTop;

  const track = Math.floor(y / trackHeight);

  const data = event.dataTransfer?.getData("text/plain");

  if (data?.startsWith("clip:")) {
    // Déplacement d'un clip existant - utiliser l'offset pour la position
    const clipId = data.replace("clip:", "");
    const adjustedX = x - dragOffsetX.value;
    const col = Math.max(0, Math.floor(adjustedX / cellWidth));
    sequencerStore.moveClip(clipId, col, track);
  } else if (draggedSequenceId.value) {
    // Ajout d'un nouveau clip depuis le picker
    const col = Math.floor(x / cellWidth);
    sequencerStore.addClipToArrangement(draggedSequenceId.value, col, track);
  }

  // Nettoyer
  draggedSequenceId.value = null;
  draggedClipId.value = null;
  dragOffsetX.value = 0;
  dropPreview.value = null;
};

const getDropPreviewStyle = () => {
  if (!dropPreview.value) return {};
  return {
    left: `${dropPreview.value.x}px`,
    top: `${dropPreview.value.y}px`,
    width: `${dropPreview.value.width}px`,
    height: `${trackHeight}px`,
  };
};

// Fonctions de trim (couper) des clips
const startResize = (
  event: MouseEvent,
  clip: ArrangementClip,
  direction: "left" | "right",
) => {
  event.preventDefault();
  trimmingClipId.value = clip.id;
  trimDirection.value = direction;
  trimStartMouseX.value = event.clientX;
  trimStartOffset.value = clip.startOffset || 0;
  trimEndOffset.value = clip.endOffset || 0;

  // Sélectionner le clip
  selectedClips.value.clear();
  selectedClips.value.add(clip.id);

  // Ajouter les listeners globaux
  document.addEventListener("mousemove", onTrimMove);
  document.addEventListener("mouseup", onTrimEnd);
};

const onTrimMove = (event: MouseEvent) => {
  if (!trimmingClipId.value || !trimDirection.value) return;

  const deltaX = event.clientX - trimStartMouseX.value;
  const deltaCols = Math.round(deltaX / cellWidth);

  if (trimDirection.value === "right") {
    // Trim depuis la droite : augmenter le endOffset (couper la fin)
    const newEndOffset = trimEndOffset.value - deltaCols;
    sequencerStore.trimClipEnd(trimmingClipId.value, newEndOffset);
  } else {
    // Trim depuis la gauche : augmenter le startOffset (le store ajuste aussi la position X)
    const newStartOffset = trimStartOffset.value + deltaCols;
    sequencerStore.trimClipStart(trimmingClipId.value, newStartOffset);
  }
};

const onTrimEnd = () => {
  trimmingClipId.value = null;
  trimDirection.value = null;
  document.removeEventListener("mousemove", onTrimMove);
  document.removeEventListener("mouseup", onTrimEnd);
};

// Fonctions de style des clips
const getClipStyle = (clip: ArrangementClip) => {
  // Utiliser la durée personnalisée si définie, sinon la durée de la séquence
  const clipDuration = sequencerStore.getClipDuration(clip);
  const width = clipDuration * cellWidth;

  return {
    left: `${clip.x * cellWidth}px`,
    top: `${clip.y * trackHeight}px`,
    width: `${width}px`,
    height: `${trackHeight - 4}px`,
    backgroundColor: clip.color || "var(--color-primary)",
  };
};

const getSequenceName = (sequenceId: string): string => {
  const sequence = sequencerStore.getSequenceById(sequenceId);
  return sequence?.name || "Unknown";
};

// Preview des notes dans le clip (filtrées selon le trim)
const getClipNotesPreview = (clip: ArrangementClip): MidiNote[] => {
  const sequence = sequencerStore.getSequenceById(clip.sequenceId);
  if (!sequence) return [];

  const startOffset = clip.startOffset || 0;
  const endOffset = clip.endOffset || 0;
  const visibleEnd = sequence.cols - endOffset;

  // Filtrer les notes qui sont visibles dans la zone trimée
  return sequence.layout.filter((note) => {
    const noteEnd = note.x + note.w;
    // La note doit être au moins partiellement visible dans la zone [startOffset, visibleEnd]
    return noteEnd > startOffset && note.x < visibleEnd;
  });
};

const getNotePreviewStyle = (note: MidiNote, clip: ArrangementClip) => {
  const sequence = sequencerStore.getSequenceById(clip.sequenceId);
  if (!sequence) return {};

  const startOffset = clip.startOffset || 0;
  const endOffset = clip.endOffset || 0;
  const clipDuration = sequence.cols - startOffset - endOffset;
  const visibleEnd = sequence.cols - endOffset;

  // Calculer la partie visible de la note
  const visibleStart = Math.max(note.x, startOffset) - startOffset;
  const visibleNoteEnd = Math.min(note.x + note.w, visibleEnd) - startOffset;
  const visibleWidth = visibleNoteEnd - visibleStart;

  // Normaliser la position Y (0-86 vers 0-100%)
  const normalizedY = (note.y / 87) * 100;

  return {
    left: `${(visibleStart / clipDuration) * 100}%`,
    top: `${normalizedY}%`,
    width: `${(visibleWidth / clipDuration) * 100}%`,
    height: "2px",
  };
};

// Sélection des clips
const selectClip = (event: MouseEvent, clip: ArrangementClip) => {
  if (event.ctrlKey || event.metaKey) {
    if (selectedClips.value.has(clip.id)) {
      selectedClips.value.delete(clip.id);
    } else {
      selectedClips.value.add(clip.id);
    }
  } else {
    selectedClips.value.clear();
    selectedClips.value.add(clip.id);
  }
};

// Menu contextuel
const showClipContextMenu = (event: MouseEvent, clip: ArrangementClip) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    clipId: clip.id,
  };
};

const hideContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.clipId = null;
};

const duplicateContextClip = () => {
  if (contextMenu.value.clipId) {
    sequencerStore.duplicateClip(contextMenu.value.clipId);
  }
  hideContextMenu();
};

const makeContextClipUnique = () => {
  if (contextMenu.value.clipId) {
    sequencerStore.makeClipUnique(contextMenu.value.clipId);
  }
  hideContextMenu();
};

const editContextClipSequence = () => {
  if (contextMenu.value.clipId) {
    const clip = sequencerStore.arrangementClips.find(
      (c) => c.id === contextMenu.value.clipId,
    );
    if (clip) {
      emit("editSequence", clip.sequenceId);
    }
  }
  hideContextMenu();
};

const deleteContextClip = () => {
  if (contextMenu.value.clipId) {
    sequencerStore.removeClipFromArrangement(contextMenu.value.clipId);
  }
  hideContextMenu();
};

// Actions sur les clips sélectionnés
const deleteSelectedClips = () => {
  selectedClips.value.forEach((clipId) => {
    sequencerStore.removeClipFromArrangement(clipId);
  });
  selectedClips.value.clear();
};

const duplicateSelectedClips = () => {
  selectedClips.value.forEach((clipId) => {
    sequencerStore.duplicateClip(clipId);
  });
};

// Navigation vers l'édition de séquence
const editSequence = (sequenceId: string) => {
  sequencerStore.setActiveSequence(sequenceId);
  emit("editSequence", sequenceId);
};

const editClipSequence = (clip: ArrangementClip) => {
  emit("editSequence", clip.sequenceId);
};

const createNewSequence = () => {
  sequencerStore.createSequence();
};

// Scroll synchronisé
const onGridScroll = () => {
  if (gridRef.value && timelineHeaderRef.value) {
    // Utiliser transform pour une synchronisation plus fluide
    const scrollLeft = gridRef.value.scrollLeft;
    const inner = timelineHeaderRef.value.querySelector(
      ".timeline-header-inner",
    ) as HTMLElement;
    if (inner) {
      inner.style.transform = `translateX(-${scrollLeft}px)`;
    }
  }
};

// Clic sur le header pour repositionner le curseur de lecture
const onTimelineHeaderClick = (event: MouseEvent) => {
  if (!timelineHeaderRef.value || !gridRef.value) return;

  const rect = timelineHeaderRef.value.getBoundingClientRect();
  const clickX = event.clientX - rect.left;

  // Ajouter le scroll horizontal pour obtenir la position réelle
  const scrollLeft = gridRef.value.scrollLeft;
  const actualX = clickX + scrollLeft;

  // Convertir en position de colonne
  const newPosition = Math.floor(actualX / cellWidth);

  // Limiter à la longueur de l'arrangement
  const maxPosition = sequencerStore.getArrangementLength();
  const clampedPosition = Math.max(0, Math.min(newPosition, maxPosition - 1));

  // Mettre à jour la position
  currentPosition.value = clampedPosition;
  precisePosition.value = clampedPosition;

  // Si on est en lecture, recalculer le temps de départ
  if (isPlaying.value) {
    playbackStartTime.value = performance.now();
    lastNoteCheckPosition.value = clampedPosition - 1;
  }
};

// Tempo
const updateTempo = (event: Event) => {
  const target = event.target as HTMLInputElement;
  sequencerStore.arrangementTempo = parseInt(target.value);
};

// Playback
const togglePlayback = () => {
  if (isPlaying.value) {
    pausePlayback();
  } else {
    startPlayback();
  }
};

const startPlayback = () => {
  isPlaying.value = true;
  playbackStartTime.value = performance.now();
  lastNoteCheckPosition.value = Math.floor(currentPosition.value) - 1;

  const animate = (timestamp: number) => {
    if (!isPlaying.value) return;

    const elapsed = timestamp - playbackStartTime.value;
    const beatsPerSecond = sequencerStore.arrangementTempo / 60;
    const stepsPerSecond = beatsPerSecond * 4;
    const stepsElapsed = (elapsed / 1000) * stepsPerSecond;

    precisePosition.value = currentPosition.value + stepsElapsed;
    const newIntegerPosition = Math.floor(precisePosition.value);

    if (newIntegerPosition > lastNoteCheckPosition.value) {
      for (
        let pos = lastNoteCheckPosition.value + 1;
        pos <= newIntegerPosition;
        pos++
      ) {
        if (pos < sequencerStore.getArrangementLength()) {
          playNotesAtPosition(pos);
        }
      }
      lastNoteCheckPosition.value = newIntegerPosition;
    }

    if (precisePosition.value >= sequencerStore.getArrangementLength()) {
      stopPlayback();
      return;
    }

    playbackAnimationId.value = requestAnimationFrame(animate);
  };

  playbackAnimationId.value = requestAnimationFrame(animate);
};

const pausePlayback = () => {
  isPlaying.value = false;
  if (playbackAnimationId.value) {
    cancelAnimationFrame(playbackAnimationId.value);
    playbackAnimationId.value = null;
  }
  currentPosition.value = Math.floor(precisePosition.value);
};

const stopPlayback = () => {
  // Arrêter toutes les notes actives
  activeNotes.value.forEach((noteId) => {
    // Trouver la note et émettre l'événement de fin
    const parts = noteId.split("_");
    if (parts.length >= 2) {
      const noteName = sequencerStore.getNoteNameFromY(0); // Placeholder
      if (enableKeyboardSimulation.value) {
        midiStore.simulateKeyRelease(noteName);
      }
    }
  });

  activeNotes.value.clear();
  pausePlayback();
  currentPosition.value = 0;
  precisePosition.value = 0;
};

const playNotesAtPosition = (position: number) => {
  // Arrêter les notes qui se terminent
  const notesToStop =
    sequencerStore.getArrangementNotesEndingAtPosition(position);
  notesToStop.forEach(({ note, noteName }) => {
    activeNotes.value.delete(note.i);
    emit("noteEnd", note, noteName, position);
    if (enableKeyboardSimulation.value) {
      midiStore.simulateKeyRelease(noteName);
    }
  });

  // Démarrer les nouvelles notes
  const notesToStart = sequencerStore.getArrangementNotesAtPosition(position);
  notesToStart.forEach(({ note, noteName }) => {
    activeNotes.value.add(note.i);
    emit("noteStart", note, noteName, position);
    if (enableKeyboardSimulation.value) {
      midiStore.simulateKeyPress(noteName);
    }
  });
};

// Raccourcis clavier
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    togglePlayback();
  } else if (event.code === "Delete" || event.code === "Backspace") {
    event.preventDefault();
    deleteSelectedClips();
  } else if (event.code === "Escape") {
    event.preventDefault();
    selectedClips.value.clear();
    hideContextMenu();
  }
};

// Fermer le menu contextuel en cliquant ailleurs
const handleGlobalClick = () => {
  hideContextMenu();
};

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("click", handleGlobalClick);
  document.removeEventListener("mousemove", onTrimMove);
  document.removeEventListener("mouseup", onTrimEnd);
  if (playbackAnimationId.value) {
    cancelAnimationFrame(playbackAnimationId.value);
  }
});
</script>

<style scoped>
.arrangement-container {
  display: flex;
  height: 100%;
  background-color: var(--color-bg-primary-dark);
  color: white;
}

/* Picker Panel (Sidebar) */
.sequence-picker {
  width: 200px;
  background-color: #1a1a1a;
  border-right: 2px solid #333;
  display: flex;
  flex-direction: column;
}

.picker-header {
  padding: 12px;
  background-color: #2a2a2a;
  border-bottom: 1px solid #333;
}

.picker-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--color-primary);
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.picker-item {
  padding: 10px 12px;
  margin-bottom: 4px;
  background-color: #2a2a2a;
  border-radius: 4px;
  cursor: grab;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.picker-item:hover {
  background-color: #3a3a3a;
}

.picker-item.active {
  background-color: var(--color-primary);
}

.picker-item:active {
  cursor: grabbing;
}

.sequence-name {
  font-size: 12px;
  font-weight: bold;
}

.sequence-length {
  font-size: 10px;
  opacity: 0.7;
}

.picker-footer {
  padding: 12px;
  border-top: 1px solid #333;
}

/* Main Area */
.arrangement-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.arrangement-header {
  display: flex;
  background-color: #2a2a2a;
  border-bottom: 2px solid #333;
}

.track-labels-header {
  width: 80px;
  background-color: #333;
  border-right: 2px solid #444;
}

.timeline-header {
  flex: 1;
  display: flex;
  height: 30px;
  overflow: hidden;
  cursor: pointer;
}

.timeline-header-inner {
  display: flex;
  flex-shrink: 0;
}

.measure-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #555;
  font-size: 11px;
  color: #aaa;
}

/* Body */
.arrangement-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.track-labels {
  width: 80px;
  background-color: #333;
  border-right: 2px solid #444;
}

.track-label {
  height: 75px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
  border-bottom: 1px solid #444;
  color: #888;
}

/* Grid */
.arrangement-grid {
  flex: 1;
  position: relative;
  overflow: auto;
  background-color: #1a1a1a;
}

.background-grid {
  position: absolute;
  top: 0;
  left: 0;
}

.grid-row {
  display: flex;
  height: 75px;
  border-bottom: 1px solid #2a2a2a;
}

.grid-cell {
  width: 20px;
  border-left: 1px solid #222;
}

.grid-cell.beat-marker {
  border-left: 1px solid #444;
}

/* Clips Layer */
.clips-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.arrangement-clip {
  position: absolute;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: move;
  pointer-events: all;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.1s,
    box-shadow 0.1s;
}

.arrangement-clip:hover {
  transform: scale(1.01);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.arrangement-clip.selected {
  outline: 2px solid var(--color-warning);
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.4);
}

.arrangement-clip.dragging {
  opacity: 0.5;
}

.arrangement-clip.trimming {
  opacity: 0.8;
  z-index: 10;
}

/* Poignées de trim (couper le clip) */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 5;
  opacity: 0;
  transition:
    opacity 0.2s,
    background-color 0.2s;
}

.resize-handle:hover,
.arrangement-clip.trimming .resize-handle {
  opacity: 1;
}

.resize-handle-left {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.4), transparent);
  border-radius: 4px 0 0 4px;
}

.resize-handle-right {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.4), transparent);
  border-radius: 0 4px 4px 0;
}

.resize-handle:active {
  background-color: rgba(255, 255, 255, 0.6);
}

.clip-name {
  font-size: 11px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.clip-notes-preview {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.5;
}

.preview-note {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 1px;
}

/* Drop Preview */
.drop-preview {
  position: absolute;
  background-color: rgba(51, 122, 183, 0.3);
  border: 2px dashed var(--color-primary);
  border-radius: 4px;
  pointer-events: none;
}

/* Playback Cursor */
.playback-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--color-error);
  z-index: 20;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(238, 53, 53, 0.6);
}

/* Controls */
.arrangement-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background-color: #2a2a2a;
  border-top: 2px solid #333;
}

.playback-controls {
  display: flex;
  gap: 8px;
}

.tempo-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tempo-control label {
  font-size: 12px;
  font-weight: bold;
}

.tempo-slider {
  width: 100px;
  accent-color: var(--color-primary);
}

.position-display {
  font-family: "Courier New", monospace;
  font-weight: bold;
  font-size: 14px;
  background-color: #1a1a1a;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #444;
}

.selection-controls {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-small {
  padding: 6px 12px;
  font-size: 11px;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--color-secondary-hover);
}

.btn-warning {
  background-color: var(--color-warning);
  color: black;
}

.btn-warning:hover {
  background-color: var(--color-warning-hover);
}

.btn-pause {
  background-color: var(--color-warning-active) !important;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.1s;
}

.context-menu-item:hover {
  background-color: #3a3a3a;
}

.context-menu-item.danger {
  color: var(--color-error);
}

.context-menu-item.danger:hover {
  background-color: rgba(238, 53, 53, 0.2);
}
</style>
