import { ref, watch, type Ref } from "vue";
import { useTimelineStore } from "../../stores/timelineStore";
import { useTrackAudioStore } from "../../stores/trackAudioStore";
import { useTrackHistoryStore } from "../../stores/trackHistoryStore";
import { useToast } from "../useToast";
import { useMidiKeyboard } from "../useMidiKeyboard";
import {
  noteIndexToName,
  midiPitchToY,
} from "../../lib/audio/pianoRollConstants";
import { snapNoteToGrid } from "../../lib/audio/timeGrid";

export interface MidiRecordingPlaybackDeps {
  isPlaying: Ref<boolean>;
  currentPosition: Ref<number>;
  checkpointPosition: Ref<number>;
  startPlayback: () => void;
  stopPlayback: () => void;
}

// Largeur initiale (ticks) d'une note dès son note-on, avant qu'elle ne
// grandisse en direct avec la position de lecture — juste assez pour être
// visible immédiatement dans le piano roll/la preview de piste.
const LIVE_NOTE_MIN_WIDTH = 4;

/**
 * Jeu en live + enregistrement MIDI : le monitoring (jouer l'instrument de la
 * piste armée) est toujours actif, indépendamment de l'enregistrement.
 * `playback.stopPlayback` déclenche `finishMidiRecording` via le callback
 * `onStop` de useTimelinePlaybackEngine, comme pour useTimelineVoiceRecording.
 *
 * Preview live : chaque note est insérée en brut (non quantizée) directement
 * dans track.notes dès le note-on et grandit à chaque frame tant qu'elle est
 * tenue — le piano roll et la preview de piste l'affichent donc pendant qu'on
 * joue, gratuitement (même rendu que n'importe quelle note du store). Elle
 * n'est snappée sur la grille qu'une fois l'enregistrement terminé.
 */
export function useTimelineMidiRecording(playback: MidiRecordingPlaybackDeps) {
  const timelineStore = useTimelineStore();
  const trackAudioStore = useTrackAudioStore();
  const trackHistoryStore = useTrackHistoryStore();
  const { success, error } = useToast();
  const midiKeyboard = useMidiKeyboard();

  const isRecordingMidi = ref(false);
  // pitch -> note brute déjà insérée dans track.notes, en cours d'écriture.
  const pendingNotes = new Map<number, { noteId: string; startTick: number }>();

  // Piste ciblée par la prise en cours, figée au démarrage (un changement
  // d'armement en cours de route n'affecte pas l'enregistrement déjà lancé).
  let recordingTrackId: string | null = null;
  let recordedNoteIds: string[] = [];

  // Fait grandir en direct les notes tenues, à chaque frame de la boucle de
  // playback — pas de rAF dédié, on suit simplement currentPosition.
  watch(playback.currentPosition, (tick) => {
    if (!isRecordingMidi.value || !recordingTrackId) return;
    const roundedTick = Math.round(tick);
    for (const { noteId, startTick } of pendingNotes.values()) {
      timelineStore.updateNoteInTrack(recordingTrackId, noteId, {
        w: Math.max(1, roundedTick - startTick),
      });
    }
  });

  // Touches physiquement enfoncées, indépendamment de l'enregistrement — sert
  // à compter dès le début du record une note déjà tenue au moment du clic
  // (pendant le décompte, par ex.), voir toggleMidiRecording().
  const heldNotes = new Map<number, number>();

  midiKeyboard.onNoteOn((pitch, velocity) => {
    heldNotes.set(pitch, velocity);

    const trackId = timelineStore.armedTrackId;
    if (!trackId) return;

    const noteName = noteIndexToName(midiPitchToY(pitch));
    trackAudioStore.playNoteOnTrack(
      trackId,
      noteName,
      `live_${pitch}`,
      velocity,
    );

    if (isRecordingMidi.value && recordingTrackId) {
      const startTick = Math.round(playback.currentPosition.value);
      const noteId = timelineStore.addNoteToTrack(recordingTrackId, {
        x: startTick,
        y: midiPitchToY(pitch),
        w: LIVE_NOTE_MIN_WIDTH,
        v: velocity,
      });
      if (noteId) {
        pendingNotes.set(pitch, { noteId, startTick });
        recordedNoteIds.push(noteId);
      }
    }
  });

  midiKeyboard.onNoteOff((pitch) => {
    heldNotes.delete(pitch);

    const trackId = timelineStore.armedTrackId;
    if (trackId) trackAudioStore.stopNoteOnTrack(trackId, `live_${pitch}`);

    const pending = pendingNotes.get(pitch);
    pendingNotes.delete(pitch);
    if (!pending || !recordingTrackId) return;

    const w = Math.max(
      1,
      Math.round(playback.currentPosition.value) - pending.startTick,
    );
    timelineStore.updateNoteInTrack(recordingTrackId, pending.noteId, { w });
  });

  const toggleMidiRecording = (): void => {
    if (isRecordingMidi.value) {
      playback.stopPlayback();
      return;
    }

    const trackId = timelineStore.armedTrackId;
    if (!trackId) {
      error("Armez une piste instrument avant d'enregistrer en MIDI.");
      return;
    }

    recordingTrackId = trackId;
    recordedNoteIds = [];
    pendingNotes.clear();
    trackHistoryStore.startBatch(trackId, "Enregistrement MIDI live");

    // Note(s) déjà tenue(s) au lancement du record (ex: pendant le décompte) :
    // insérées dès maintenant, depuis la position de départ.
    const startTick = Math.round(playback.checkpointPosition.value);
    for (const [pitch, velocity] of heldNotes) {
      const noteId = timelineStore.addNoteToTrack(trackId, {
        x: startTick,
        y: midiPitchToY(pitch),
        w: LIVE_NOTE_MIN_WIDTH,
        v: velocity,
      });
      if (noteId) {
        pendingNotes.set(pitch, { noteId, startTick });
        recordedNoteIds.push(noteId);
      }
    }

    isRecordingMidi.value = true;
    if (!playback.isPlaying.value) {
      playback.startPlayback();
    }
  };

  const finishMidiRecording = (): void => {
    if (!isRecordingMidi.value) return;
    isRecordingMidi.value = false;

    const trackId = recordingTrackId;
    recordingTrackId = null;
    if (!trackId) return;

    // Notes encore tenues à l'arrêt : les clôturer à la position courante.
    const roundedTick = Math.round(playback.currentPosition.value);
    for (const { noteId, startTick } of pendingNotes.values()) {
      timelineStore.updateNoteInTrack(trackId, noteId, {
        w: Math.max(1, roundedTick - startTick),
      });
    }
    pendingNotes.clear();

    if (recordedNoteIds.length === 0) {
      trackHistoryStore.cancelBatch();
      recordedNoteIds = [];
      return;
    }

    // Les notes sont déjà dans la piste (brutes, pour la preview live) : on
    // les snappe en place plutôt que d'en réinsérer.
    const track = timelineStore.project.tracks.find((t) => t.id === trackId);
    for (const noteId of recordedNoteIds) {
      const note = track?.notes.find((n) => n.i === noteId);
      if (!note) continue;
      const snapped = snapNoteToGrid(note, timelineStore.subdivision);
      timelineStore.updateNoteInTrack(trackId, noteId, snapped);
    }
    trackHistoryStore.endBatch();

    success(`${recordedNoteIds.length} note(s) enregistrée(s).`);
    recordedNoteIds = [];
  };

  const showMidiPicker = ref(false);
  const toggleMidiPicker = async (): Promise<void> => {
    showMidiPicker.value = !showMidiPicker.value;
    if (showMidiPicker.value) {
      await midiKeyboard.requestAccess();
    }
  };
  const selectMidiInput = (id: string): void => {
    midiKeyboard.selectInput(id);
    showMidiPicker.value = false;
  };
  const closeMidiPicker = (): void => {
    showMidiPicker.value = false;
  };

  return {
    midiSupported: midiKeyboard.isSupported,
    midiInputs: midiKeyboard.inputs,
    selectedMidiInputId: midiKeyboard.selectedInputId,
    midiError: midiKeyboard.error,
    isRecordingMidi,
    toggleMidiRecording,
    finishMidiRecording,
    showMidiPicker,
    toggleMidiPicker,
    selectMidiInput,
    closeMidiPicker,
  };
}
