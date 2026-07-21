import { onMounted, onBeforeUnmount } from "vue";
import type { NoteName } from "../../lib/utils/types";
import {
  BASE_MIDI_NOTE,
  CODE_TO_SEMITONE_OFFSET,
} from "../../lib/audio/pianoKeyboardMap";

export interface PianoKeyboardPreviewActions {
  onNoteStart: (note: NoteName) => void;
  onNoteStop: (note: NoteName) => void;
}

const NOTE_NAMES_ASCENDING = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const midiToNoteName = (midiNote: number): NoteName => {
  const octave = Math.floor(midiNote / 12) - 1;
  const semitone = ((midiNote % 12) + 12) % 12;
  return `${NOTE_NAMES_ASCENDING[semitone]}${octave}`;
};

// Même sémantique que usePianoGridKeyboard::isTypingTarget : un preview de
// note ne doit jamais se déclencher pendant une saisie de texte.
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  return target.tagName === "TEXTAREA" || target.isContentEditable;
};

export function usePianoRollComputerKeyboard(
  actions: PianoKeyboardPreviewActions,
) {
  const heldCodes = new Set<string>();

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    // Laisse passer les raccourcis (Ctrl/Cmd+C/V/D/Z...) sans jouer de note.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;

    const offset = CODE_TO_SEMITONE_OFFSET[event.code];
    if (offset === undefined || heldCodes.has(event.code)) return;

    heldCodes.add(event.code);
    actions.onNoteStart(midiToNoteName(BASE_MIDI_NOTE + offset));
  };

  const handleKeyup = (event: KeyboardEvent) => {
    if (!heldCodes.has(event.code)) return;
    heldCodes.delete(event.code);

    const offset = CODE_TO_SEMITONE_OFFSET[event.code];
    actions.onNoteStop(midiToNoteName(BASE_MIDI_NOTE + offset));
  };

  // Évite les notes bloquées si l'utilisateur change de fenêtre/onglet en
  // gardant une touche enfoncée (le keyup correspondant n'arrivera jamais).
  const releaseAllHeldNotes = () => {
    heldCodes.forEach((code) => {
      const offset = CODE_TO_SEMITONE_OFFSET[code];
      if (offset !== undefined) {
        actions.onNoteStop(midiToNoteName(BASE_MIDI_NOTE + offset));
      }
    });
    heldCodes.clear();
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    window.addEventListener("blur", releaseAllHeldNotes);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
    window.removeEventListener("blur", releaseAllHeldNotes);
    releaseAllHeldNotes();
  });
}
