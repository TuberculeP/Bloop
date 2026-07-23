import type { Dx7Patch } from "../../../utils/types";
import rom1aPresets from "./presets/rom1a.json";

export { FmSynthEngine } from "./FmSynthEngine";
export { ALGORITHMS, type Dx7Algorithm } from "./dsp/voiceDx7";

// Bank ROM1A du DX7 original (32 presets d'usine), parsé depuis le sysex.
export const FM_SYNTH_PRESETS = rom1aPresets as Dx7Patch[];
