<script setup lang="ts">
import { ref, computed, watchEffect, onBeforeUnmount } from "vue";
import type { Track, MidiNote, NoteName } from "../../../../lib/utils/types";
import { useTimelineStore } from "../../../../stores/timelineStore";
import { useTrackAudioStore } from "../../../../stores/trackAudioStore";
import { useTrackHistoryStore } from "../../../../stores/trackHistoryStore";
import {
  TOTAL_NOTES,
  NOTE_ROW_HEIGHT,
  noteIndexToName,
} from "../../../../lib/audio/pianoRollConstants";
import { snapTicks } from "../../../../lib/audio/timeGrid";
import PianoKeys from "./PianoKeys.vue";
import PianoKeysCanvas from "./PianoKeysCanvas.vue";
import PianoGridCanvas from "./PianoGridCanvas.vue";

const USE_CANVAS = true;

const keysContainerRef = ref<HTMLElement | null>(null);
const gridContainerRef = ref<HTMLElement | null>(null);

// Hauteur fixe du viewport piano roll (voir .piano-roll-wrapper ci-dessous) :
// PianoGridCanvas/PianoKeysCanvas n'ont plus besoin de rendre que cette
// tranche visible plutôt que la hauteur complète de la grille (1392px).
const PIANO_ROLL_VIEWPORT_HEIGHT = 400;

// scrollTop courant, utilisé par PianoGridCanvas/PianoKeysCanvas pour savoir
// quelle tranche verticale peindre (canvas maintenant dimensionné au
// viewport, plus à la grille complète).
const scrollTop = ref(0);

// Sync basée sur la valeur plutôt qu'un flag+rAF : un flag temporel suppose
// au plus un scroll par frame, ce qui casse sous charge (pendant le playback,
// activeNotes change de référence à chaque frame et force un redraw canvas
// continu) — un scroll réel arrivant pendant la fenêtre de verrouillage était
// silencieusement ignoré, désynchronisant les deux conteneurs jusqu'à ce
// qu'un scroll ultérieur écrase l'un avec la valeur périmée de l'autre
// (symptôme : la vue des octaves "rollback"). Comparer les valeurs élimine
// la boucle infinie sans jamais pouvoir perdre un événement. Le même garde-fou
// protège maintenant aussi la mise à jour de `scrollTop` (qui déclenche un
// redraw canvas) pour ne pas réintroduire cette classe de bug.
const syncScrollFromGrid = () => {
  if (!keysContainerRef.value || !gridContainerRef.value) return;
  if (keysContainerRef.value.scrollTop !== gridContainerRef.value.scrollTop) {
    keysContainerRef.value.scrollTop = gridContainerRef.value.scrollTop;
  }
  if (scrollTop.value !== gridContainerRef.value.scrollTop) {
    scrollTop.value = gridContainerRef.value.scrollTop;
  }
};

const syncScrollFromKeys = () => {
  if (!keysContainerRef.value || !gridContainerRef.value) return;
  if (gridContainerRef.value.scrollTop !== keysContainerRef.value.scrollTop) {
    gridContainerRef.value.scrollTop = keysContainerRef.value.scrollTop;
  }
  if (scrollTop.value !== keysContainerRef.value.scrollTop) {
    scrollTop.value = keysContainerRef.value.scrollTop;
  }
};

const props = defineProps<{
  track: Track;
  cols: number;
  colWidth: number;
  playbackPosition: number;
  isPlaying: boolean;
  scrollLeft: number;
  viewportWidth: number;
}>();

const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();
const trackHistoryStore = useTrackHistoryStore();

const gridHeight = computed(() => TOTAL_NOTES * NOTE_ROW_HEIGHT);

const activePreviewNotes = ref<Set<NoteName>>(new Set());

const setsAreEqual = (a: Set<NoteName>, b: Set<NoteName>): boolean => {
  if (a.size !== b.size) return false;
  for (const note of a) {
    if (!b.has(note)) return false;
  }
  return true;
};

// allActiveNotes ref réassigné seulement si son contenu change réellement
// (pas juste à chaque tick de playbackPosition, qui bouge à 60fps) : cette
// valeur est passée en prop à PianoGridCanvas/PianoKeysCanvas, dont les watch
// déclenchent un redraw complet du canvas dès que la référence change. Avec
// un computed recréant un Set à chaque frame (même quand aucune note n'a
// réellement démarré/stoppé), les deux canvases redessinaient 60x/s, ce qui
// sature le thread principal pendant le playback (lag au zoom, et scroll
// vertical du piano roll qui "rollback" sous la charge — voir le fix de sync
// scrollTop plus haut, insuffisant seul face à cette charge).
const allActiveNotes = ref<Set<NoteName>>(new Set());

watchEffect(() => {
  const combined = new Set<NoteName>(activePreviewNotes.value);
  if (props.isPlaying) {
    const intPosition = Math.floor(props.playbackPosition);
    for (const note of props.track.notes) {
      if (intPosition >= note.x && intPosition < note.x + note.w) {
        combined.add(noteIndexToName(note.y));
      }
    }
  }
  if (!setsAreEqual(combined, allActiveNotes.value)) {
    allActiveNotes.value = combined;
  }
});

const getPreviewNoteId = (note: NoteName): string => `preview_${note}`;

const handleNoteStart = (note: NoteName): void => {
  if (activePreviewNotes.value.has(note)) return;
  activePreviewNotes.value.add(note);
  trackAudioStore.playNoteOnTrack(props.track.id, note, getPreviewNoteId(note));
};

const handleNoteStop = (note: NoteName): void => {
  if (!activePreviewNotes.value.has(note)) return;
  activePreviewNotes.value.delete(note);
  trackAudioStore.stopNoteOnTrack(props.track.id, getPreviewNoteId(note));
};

const handleAllNotesStop = (): void => {
  activePreviewNotes.value.forEach((note) => {
    trackAudioStore.stopNoteOnTrack(props.track.id, getPreviewNoteId(note));
  });
  activePreviewNotes.value.clear();
};

const handleAddNote = (x: number, y: number, useGridSize: boolean): void => {
  const gridSize = snapTicks(timelineStore.subdivision);
  const width = useGridSize
    ? gridSize
    : (timelineStore.lastResizedNoteWidth ?? gridSize);
  const noteId = trackHistoryStore.recordAddNote(props.track.id, {
    x,
    y,
    w: width,
  });
  if (noteId) {
    const noteName = noteIndexToName(y);
    trackAudioStore.playNoteOnTrack(props.track.id, noteName, noteId);
    setTimeout(
      () => trackAudioStore.stopNoteOnTrack(props.track.id, noteId),
      200,
    );
  }
};

const handleRemoveNote = (noteId: string): void => {
  trackHistoryStore.recordRemoveNote(props.track.id, noteId);
};

const handlePasteNotes = (
  notes: Array<{ x: number; y: number; w: number }>,
): void => {
  trackHistoryStore.startBatch(props.track.id, `Paste ${notes.length} notes`);
  for (const note of notes) {
    timelineStore.addNoteToTrack(props.track.id, {
      x: note.x,
      y: note.y,
      w: note.w,
    });
  }
  trackHistoryStore.endBatch();
};

const handleDeleteNotes = (noteIds: string[]): void => {
  trackHistoryStore.startBatch(
    props.track.id,
    `Delete ${noteIds.length} notes`,
  );
  for (const noteId of noteIds) {
    timelineStore.removeNoteFromTrack(props.track.id, noteId);
  }
  trackHistoryStore.endBatch();
};

const handleUpdateNotes = (
  updates: Array<{ noteId: string; updates: Partial<MidiNote> }>,
): void => {
  const desc =
    updates.length === 1 ? "Update note" : `Update ${updates.length} notes`;
  trackHistoryStore.startBatch(props.track.id, desc);
  for (const { noteId, updates: noteUpdates } of updates) {
    timelineStore.updateNoteInTrack(props.track.id, noteId, noteUpdates);
  }
  trackHistoryStore.endBatch();
};

const handleUndo = (): void => {
  trackHistoryStore.undo(props.track.id);
};

const handleRedo = (): void => {
  trackHistoryStore.redo(props.track.id);
};

onBeforeUnmount(() => {
  handleAllNotesStop();
});
</script>

<template>
  <div class="piano-roll-wrapper">
    <div
      ref="keysContainerRef"
      class="piano-keys-container"
      @scroll="syncScrollFromKeys"
    >
      <component
        :is="USE_CANVAS ? PianoKeysCanvas : PianoKeys"
        :active-notes="allActiveNotes"
        :grid-height="gridHeight"
        :scroll-top="scrollTop"
        :viewport-height="PIANO_ROLL_VIEWPORT_HEIGHT"
        @note-start="handleNoteStart"
        @note-stop="handleNoteStop"
        @all-notes-stop="handleAllNotesStop"
      />
    </div>
    <div
      ref="gridContainerRef"
      class="piano-grid-container"
      :style="{ width: `${viewportWidth}px` }"
      @scroll="syncScrollFromGrid"
    >
      <PianoGridCanvas
        :notes="track.notes"
        :cols="cols"
        :col-width="colWidth"
        :color="track.color"
        :active-notes="allActiveNotes"
        :track-id="track.id"
        :scroll-left="scrollLeft"
        :scroll-top="scrollTop"
        :viewport-width="viewportWidth"
        :viewport-height="PIANO_ROLL_VIEWPORT_HEIGHT"
        @add-note="handleAddNote"
        @remove-note="handleRemoveNote"
        @update-notes="handleUpdateNotes"
        @delete-notes="handleDeleteNotes"
        @paste-notes="handlePasteNotes"
        @undo="handleUndo"
        @redo="handleRedo"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.piano-roll-wrapper {
  display: flex;
  height: 400px;
  background: var(--color-bg-primary-dark);
  border-top: 1px solid var(--color-border-secondary);
}

.piano-keys-container {
  flex-shrink: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--color-piano-key-black);

  &::-webkit-scrollbar {
    display: none;
  }
}

.piano-grid-container {
  // Bornée à la largeur du viewport visible (pas cols*colWidth) et épinglée
  // juste après la colonne des touches, comme TrackHeader.vue pour le header
  // de piste : le scroll horizontal partagé de .timeline-scroll continue de
  // s'appliquer normalement (rien entre ce conteneur et .timeline-scroll ne
  // définit d'overflow), donc `sticky` se résout bien contre lui.
  flex: 0 0 auto;
  position: sticky;
  left: 180px;
  z-index: 5;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-secondary) transparent;
}
</style>
