import { markRaw, ref } from "vue";
import { Midi } from "@tonejs/midi";
import { useTimelineStore } from "../../stores/timelineStore";
import { useTrackHistoryStore } from "../../stores/trackHistoryStore";
import { useToast } from "../useToast";
import type { MidiNote } from "../../lib/utils/types";
import { TICKS_PER_BEAT } from "../../lib/audio/timeGrid";
import { TOTAL_NOTES } from "../../lib/audio/pianoRollConstants";

// y=0 -> B7 (MIDI 107), y=86 -> A0 (MIDI 21), voir pianoRollConstants.ts
const MIDI_NOTE_MAX = 107;
const PIANO_ROLL_MIN_Y = 0;
const PIANO_ROLL_MAX_Y = TOTAL_NOTES - 1;

export interface MidiImportCandidate {
  index: number;
  label: string;
  instrumentName: string;
  noteCount: number;
}

export function useMidiImport() {
  const timelineStore = useTimelineStore();
  const trackHistoryStore = useTrackHistoryStore();
  const { success, error } = useToast();

  const midiFileInputRef = ref<HTMLInputElement | null>(null);
  const pendingTargetTrackId = ref<string | null>(null);
  const pendingMidi = ref<Midi | null>(null);

  const showMidiTrackPickerModal = ref(false);
  const midiTrackCandidates = ref<MidiImportCandidate[]>([]);
  const selectedMidiCandidateIndex = ref(0);

  const openMidiImportPicker = (trackId: string): void => {
    pendingTargetTrackId.value = trackId;
    midiFileInputRef.value?.click();
  };

  const cleanupAfterImport = (): void => {
    showMidiTrackPickerModal.value = false;
    midiTrackCandidates.value = [];
    selectedMidiCandidateIndex.value = 0;
    pendingTargetTrackId.value = null;
    pendingMidi.value = null;
  };

  const convertNotes = (
    trackId: string,
    ppq: number,
    rawNotes: Midi["tracks"][number]["notes"],
  ): { notes: MidiNote[]; skippedRange: number; skippedInvalid: number } => {
    const scale = TICKS_PER_BEAT / ppq;
    const notes: MidiNote[] = [];
    let skippedRange = 0;
    let skippedInvalid = 0;

    for (const note of rawNotes) {
      const y = MIDI_NOTE_MAX - note.midi;
      const x = Math.round(note.ticks * scale);
      const w = Math.max(1, Math.round(note.durationTicks * scale));
      if (y < PIANO_ROLL_MIN_Y || y > PIANO_ROLL_MAX_Y) {
        skippedRange++;
        continue;
      }
      if (!Number.isFinite(x) || !Number.isFinite(w)) {
        skippedInvalid++;
        continue;
      }
      notes.push({ i: timelineStore.generateNoteId(trackId), x, y, w });
    }

    return { notes, skippedRange, skippedInvalid };
  };

  const applyImport = (trackIndex: number): void => {
    const trackId = pendingTargetTrackId.value;
    const midi = pendingMidi.value;
    if (!trackId || !midi) return;

    const rawTrack = midi.tracks[trackIndex];
    const { notes, skippedRange, skippedInvalid } = convertNotes(
      trackId,
      midi.header.ppq,
      rawTrack.notes,
    );

    if (notes.length === 0) {
      if (skippedInvalid > 0) {
        error(
          `${skippedInvalid} note(s) avaient une position/durée invalide, rien n'a été importé.`,
        );
      } else if (skippedRange > 0) {
        error(
          `Les ${skippedRange} note(s) de cette piste sont hors de la plage supportée (A0-B7), rien n'a été importé.`,
        );
      } else {
        error("Aucune note trouvée dans cette piste MIDI.");
      }
      cleanupAfterImport();
      return;
    }

    trackHistoryStore.startBatch(trackId, "Import MIDI");
    timelineStore.setTrackNotes(trackId, notes);
    trackHistoryStore.endBatch();

    const skipped = skippedRange + skippedInvalid;
    success(
      skipped > 0
        ? `${notes.length} note(s) importée(s), ${skipped} ignorée(s) (hors plage ou position invalide).`
        : `${notes.length} note(s) importée(s).`,
    );
    cleanupAfterImport();
  };

  const handleMidiFileSelected = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const trackId = pendingTargetTrackId.value;

    if (!file || !trackId) {
      input.value = "";
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const midi = new Midi(buf);

      // Fichiers en division SMPTE (timecode) plutôt que ticks-par-noire :
      // @tonejs/midi ne renseigne alors pas `header.ppq`, ce qui produirait des
      // positions/durées NaN pour toutes les notes si on continuait.
      if (!Number.isFinite(midi.header.ppq) || midi.header.ppq <= 0) {
        error(
          'Ce fichier MIDI utilise un format de division non supporté (SMPTE/timecode). Réexportez-le en "ticks par noire" (PPQN) depuis votre logiciel MIDI.',
        );
        pendingTargetTrackId.value = null;
        return;
      }

      const candidates: MidiImportCandidate[] = midi.tracks
        .map((track, index) => ({
          index,
          label: track.name || track.instrument.name || `Piste ${index + 1}`,
          instrumentName: track.instrument.name || "Inconnu",
          noteCount: track.notes.length,
        }))
        .filter((candidate) => candidate.noteCount > 0);

      if (candidates.length === 0) {
        error("Ce fichier MIDI ne contient aucune piste avec des notes.");
        pendingTargetTrackId.value = null;
        return;
      }

      pendingMidi.value = markRaw(midi);

      if (candidates.length === 1) {
        applyImport(candidates[0].index);
      } else {
        midiTrackCandidates.value = candidates;
        selectedMidiCandidateIndex.value = candidates[0].index;
        showMidiTrackPickerModal.value = true;
      }
    } catch {
      error("Fichier MIDI invalide ou illisible.");
      pendingTargetTrackId.value = null;
      pendingMidi.value = null;
    } finally {
      input.value = "";
    }
  };

  const confirmMidiTrackSelection = (): void => {
    applyImport(selectedMidiCandidateIndex.value);
  };

  const cancelMidiTrackSelection = (): void => {
    cleanupAfterImport();
  };

  return {
    midiFileInputRef,
    showMidiTrackPickerModal,
    midiTrackCandidates,
    selectedMidiCandidateIndex,
    openMidiImportPicker,
    handleMidiFileSelected,
    confirmMidiTrackSelection,
    cancelMidiTrackSelection,
  };
}
