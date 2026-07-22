import type { Dx7Patch } from "../../../utils/types";

// Messages envoyés du thread principal (FmSynthEngine) vers le worklet audio.
export type FmSynthMessageToProcessor =
  | { type: "loadPatch"; patch: Dx7Patch }
  | { type: "noteOn"; noteId: string; note: number; velocity: number }
  | { type: "noteOff"; noteId: string }
  | { type: "panic" };
