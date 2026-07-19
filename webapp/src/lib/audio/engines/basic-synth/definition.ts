import type { InstrumentDefinition } from "../../instruments/registry";
import type { InstrumentEngineConstructor } from "../types";
import type { BasicSynthConfig } from "../../../utils/types";
import { BasicSynthEngine } from "./BasicSynthEngine";

export const basicSynthDefinition: InstrumentDefinition = {
  type: "basicSynth",
  label: "Synth",
  icon: "🎹",
  description: "Oscillateur simple (sine, square, saw, triangle)",
  params: [
    {
      kind: "enum",
      id: "oscillatorType",
      label: "Forme d'onde",
      defaultValue: "sine",
      options: [
        { value: "sine", label: "sine" },
        { value: "square", label: "square" },
        { value: "sawtooth", label: "sawtooth" },
        { value: "triangle", label: "triangle" },
      ],
    },
  ],
  createDefaultConfig: (): BasicSynthConfig => ({
    type: "basicSynth",
    oscillatorType: "sine",
    gain: 1,
  }),
  // Le constructeur concret prend un BasicSynthConfig (plus étroit que
  // InstrumentConfig) — cast nécessaire, chaque engine narrowe lui-même sa
  // config en interne (voir BasicSynthEngine).
  engine: BasicSynthEngine as unknown as InstrumentEngineConstructor,
};
