import type { Dx7Patch } from "../../../utils/types";

// Messages envoyés du thread principal (FmSynthEngine) vers le worklet audio.
// `time` is an AudioContext time: the processor applies the event on that
// exact sample frame (or immediately if already past).
export type FmSynthMessageToProcessor =
  | { type: "loadPatch"; patch: Dx7Patch }
  | {
      type: "noteOn";
      noteId: string;
      note: number;
      velocity: number;
      time: number;
    }
  | { type: "noteOff"; noteId: string; time: number }
  | { type: "panic" };
