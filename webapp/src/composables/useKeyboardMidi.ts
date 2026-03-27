import { ref, onUnmounted, computed, type Ref } from "vue";
import type { NoteName } from "../lib/utils/types";
import { useTrackAudioStore } from "../stores/trackAudioStore";

// Mapping position physique → note (layout-agnostic via event.code)
const KEY_CODE_TO_NOTE: Record<string, NoteName> = {
  // Octave basse (ligne ZXCVBN... physiquement) - C3 à D4
  KeyZ: "C3",
  KeyS: "C#3",
  KeyX: "D3",
  KeyD: "D#3",
  KeyC: "E3",
  KeyV: "F3",
  KeyG: "F#3",
  KeyB: "G3",
  KeyH: "G#3",
  KeyN: "A3",
  KeyJ: "A#3",
  KeyM: "B3",
  Comma: "C4",
  KeyL: "C#4",
  Period: "D4",

  // Octave haute (ligne QWERTY... physiquement) - C4 à G5
  KeyQ: "C4",
  Digit2: "C#4",
  KeyW: "D4",
  Digit3: "D#4",
  KeyE: "E4",
  KeyR: "F4",
  Digit5: "F#4",
  KeyT: "G4",
  Digit6: "G#4",
  KeyY: "A4",
  Digit7: "A#4",
  KeyU: "B4",
  KeyI: "C5",
  Digit9: "C#5",
  KeyO: "D5",
  Digit0: "D#5",
  KeyP: "E5",
  BracketLeft: "F5",
  Equal: "F#5",
  BracketRight: "G5",
};

export function useKeyboardMidi(trackId: Ref<string>) {
  const trackAudioStore = useTrackAudioStore();
  const isEnabled = ref(false);
  const pressedKeys = ref<Set<string>>(new Set());

  // Notes actives converties en NoteName pour affichage sur le clavier
  const activeNotes = computed<Set<NoteName>>(() => {
    const notes = new Set<NoteName>();
    pressedKeys.value.forEach((code) => {
      const note = KEY_CODE_TO_NOTE[code];
      if (note) notes.add(note);
    });
    return notes;
  });

  // Stoppe toutes les notes en cours (appelé sur blur, disable, unmount)
  const stopAllNotes = () => {
    pressedKeys.value.forEach((code) => {
      const note = KEY_CODE_TO_NOTE[code];
      if (note) {
        trackAudioStore.stopNoteOnTrack(trackId.value, `keyboard_${code}`);
      }
    });
    pressedKeys.value.clear();
  };

  // Perte de focus = stop tout (évite notes stuck si alt-tab pendant note)
  const handleBlur = () => {
    if (pressedKeys.value.size > 0) {
      stopAllNotes();
    }
  };

  // Visibilité page = stop tout (évite notes stuck si changement d'onglet)
  const handleVisibilityChange = () => {
    if (document.hidden && pressedKeys.value.size > 0) {
      stopAllNotes();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isEnabled.value) return;

    // Ignorer si focus dans un input/textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    // Ignorer si modifiers actifs (laisse passer Ctrl+Z, Shift+flèches, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Ignorer si Shift seul (utilisé par usePianoGridKeyboard pour déplacer notes)
    if (e.shiftKey) return;

    const note = KEY_CODE_TO_NOTE[e.code];
    // Ignorer si pas une touche MIDI ou déjà pressée (évite repeat)
    if (!note || pressedKeys.value.has(e.code)) return;

    e.preventDefault();
    pressedKeys.value.add(e.code);
    trackAudioStore.playNoteOnTrack(trackId.value, note, `keyboard_${e.code}`);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isEnabled.value) return;

    const note = KEY_CODE_TO_NOTE[e.code];
    if (!note || !pressedKeys.value.has(e.code)) return;

    pressedKeys.value.delete(e.code);
    trackAudioStore.stopNoteOnTrack(trackId.value, `keyboard_${e.code}`);
  };

  const enable = () => {
    if (isEnabled.value) return;
    isEnabled.value = true;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  };

  const disable = () => {
    if (!isEnabled.value) return;
    stopAllNotes();
    isEnabled.value = false;
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleBlur);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  const toggle = () => (isEnabled.value ? disable() : enable());

  onUnmounted(disable);

  return { isEnabled, enable, disable, toggle, activeNotes, stopAllNotes };
}
