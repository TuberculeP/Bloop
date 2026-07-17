import type { NoteName } from "../utils/types";

export const TOTAL_NOTES = 87;
export const NOTE_ROW_HEIGHT = 16;

export const NOTE_NAMES_DESCENDING = [
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
] as const;

export const WHITE_KEY_MULTIPLIERS: Record<string, number> = {
  C: 1.5,
  D: 2,
  E: 1.5,
  F: 1.5,
  G: 2,
  A: 2,
  B: 1.5,
};

export const ALL_NOTES: NoteName[] = Array.from(
  { length: TOTAL_NOTES },
  (_, i) => {
    const octave = 7 - Math.floor(i / 12);
    const noteIndex = i % 12;
    return `${NOTE_NAMES_DESCENDING[noteIndex]}${octave}` as NoteName;
  },
);

export const isBlackKey = (noteName: string): boolean => noteName.includes("#");

export const isOctaveStart = (noteName: string): boolean =>
  noteName.startsWith("C") && !noteName.includes("#");

export const getOctaveNumber = (noteName: string): number => {
  const match = noteName.match(/(\d+)$/);
  return match ? parseInt(match[1]) : 4;
};

export const noteIndexToName = (index: number): NoteName =>
  ALL_NOTES[index] || ("C4" as NoteName);

// y=0 -> B7 (MIDI 107), y=86 -> A0 (MIDI 21) : plage supportée par le piano roll.
export const MIDI_NOTE_MAX = 107;

export const midiPitchToY = (pitch: number): number => MIDI_NOTE_MAX - pitch;

export const yToMidiPitch = (y: number): number => MIDI_NOTE_MAX - y;

export const getWhiteKeys = (): NoteName[] =>
  ALL_NOTES.filter((n) => !isBlackKey(n));

export const getBlackKeys = (): NoteName[] =>
  ALL_NOTES.filter((n) => isBlackKey(n));
