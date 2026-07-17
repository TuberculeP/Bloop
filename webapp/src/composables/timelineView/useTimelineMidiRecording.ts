import { ref, type Ref } from "vue";
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
import type { MidiNote } from "../../lib/utils/types";

export interface MidiRecordingPlaybackDeps {
  isPlaying: Ref<boolean>;
  currentPosition: Ref<number>;
  checkpointPosition: Ref<number>;
  startPlayback: () => void;
  stopPlayback: () => void;
}

/**
 * Jeu en live + enregistrement MIDI : le monitoring (jouer l'instrument de la
 * piste armée) est toujours actif, indépendamment de l'enregistrement.
 * `playback.stopPlayback` déclenche `finishMidiRecording` via le callback
 * `onStop` de useTimelinePlaybackEngine, comme pour useTimelineVoiceRecording.
 */
export function useTimelineMidiRecording(playback: MidiRecordingPlaybackDeps) {
  const timelineStore = useTimelineStore();
  const trackAudioStore = useTrackAudioStore();
  const trackHistoryStore = useTrackHistoryStore();
  const { success, error } = useToast();
  const midiKeyboard = useMidiKeyboard();

  const isRecordingMidi = ref(false);
  const pendingNotes = new Map<
    number,
    { startTick: number; velocity: number }
  >();
  let recordedNotes: Omit<MidiNote, "i">[] = [];

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

    if (isRecordingMidi.value) {
      pendingNotes.set(pitch, {
        startTick: playback.currentPosition.value,
        velocity,
      });
    }
  });

  midiKeyboard.onNoteOff((pitch) => {
    heldNotes.delete(pitch);

    const trackId = timelineStore.armedTrackId;
    if (trackId) trackAudioStore.stopNoteOnTrack(trackId, `live_${pitch}`);

    const pending = pendingNotes.get(pitch);
    pendingNotes.delete(pitch);
    if (!isRecordingMidi.value || !pending) return;

    recordedNotes.push({
      x: pending.startTick,
      y: midiPitchToY(pitch),
      w: Math.max(1, playback.currentPosition.value - pending.startTick),
      v: pending.velocity,
    });
  });

  const toggleMidiRecording = (): void => {
    if (isRecordingMidi.value) {
      playback.stopPlayback();
      return;
    }

    if (!timelineStore.armedTrackId) {
      error("Armez une piste instrument avant d'enregistrer en MIDI.");
      return;
    }

    recordedNotes = [];
    pendingNotes.clear();
    // Note(s) déjà tenue(s) au lancement du record (ex: pendant le décompte) :
    // comptées depuis la position de départ, pas depuis leur note-on d'origine.
    for (const [pitch, velocity] of heldNotes) {
      pendingNotes.set(pitch, {
        startTick: playback.checkpointPosition.value,
        velocity,
      });
    }
    isRecordingMidi.value = true;
    if (!playback.isPlaying.value) {
      playback.startPlayback();
    }
  };

  const finishMidiRecording = (): void => {
    if (!isRecordingMidi.value) return;
    isRecordingMidi.value = false;

    const trackId = timelineStore.armedTrackId;

    // Notes encore tenues à l'arrêt : les clôturer à la position courante.
    for (const [pitch, pending] of pendingNotes) {
      recordedNotes.push({
        x: pending.startTick,
        y: midiPitchToY(pitch),
        w: Math.max(1, playback.currentPosition.value - pending.startTick),
        v: pending.velocity,
      });
    }
    pendingNotes.clear();

    if (!trackId || recordedNotes.length === 0) {
      recordedNotes = [];
      return;
    }

    trackHistoryStore.startBatch(trackId, "Enregistrement MIDI live");
    for (const note of recordedNotes) {
      const snapped = snapNoteToGrid(note, timelineStore.subdivision);
      timelineStore.addNoteToTrack(trackId, { ...note, ...snapped });
    }
    trackHistoryStore.endBatch();

    success(`${recordedNotes.length} note(s) enregistrée(s).`);
    recordedNotes = [];
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
