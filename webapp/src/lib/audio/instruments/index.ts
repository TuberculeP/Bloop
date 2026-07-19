// Types
export type {
  NumericInstrumentParamMeta,
  EnumInstrumentParamMeta,
  EnumInstrumentParamOption,
  InstrumentParamMeta,
} from "./types";
export type { InstrumentDefinition } from "./registry";

// Registry
export {
  registerInstrument,
  getInstrumentDefinition,
  listInstrumentDefinitions,
  createInstrumentEngine,
  getDefaultConfigForType,
} from "./registry";

// Enregistrement des instruments intégrés au chargement du module
import { registerInstrument } from "./registry";
import { basicSynthDefinition } from "../engines/basic-synth";
import { smplrDefinition } from "../engines/smplr";
import { undertaleDefinition } from "../engines/undertale";
import { audioClipDefinition } from "../engines/audio-clip";

registerInstrument(basicSynthDefinition);
registerInstrument(smplrDefinition);
registerInstrument(undertaleDefinition);
registerInstrument(audioClipDefinition);
