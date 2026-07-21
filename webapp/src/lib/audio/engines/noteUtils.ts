import type { NoteName } from "../../utils/types";

const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const A4_MIDI_NOTE = 69;
const A4_FREQUENCY = 440;

export function noteNameToMidi(noteName: NoteName): number {
  const noteRegex = /^([A-G])(#?)(\d+)$/;
  const match = noteName.match(noteRegex);

  if (!match) {
    return A4_MIDI_NOTE;
  }

  const [, note, sharp, octaveStr] = match;
  const octave = parseInt(octaveStr);

  let semitone = NOTE_OFFSETS[note];
  if (sharp === "#") {
    semitone += 1;
  }

  return octave * 12 + semitone + 12;
}

export function noteNameToFrequency(noteName: NoteName): number {
  const midiNote = noteNameToMidi(noteName);
  return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI_NOTE) / 12);
}
