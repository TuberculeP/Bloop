import type { InstrumentDefinition } from "../../instruments/registry";
import type { InstrumentEngineConstructor } from "../types";
import type { SmplrConfig } from "../../../utils/types";
import { SmplrEngine } from "./SmplrEngine";
import { SOUNDFONT_LIST } from "./soundfonts";

export const smplrDefinition: InstrumentDefinition = {
  type: "smplr",
  label: "Sampler",
  icon: "🎸",
  description: "Instruments réalistes (piano, guitare, etc.)",
  params: [
    {
      kind: "enum",
      id: "soundfont",
      label: "Instrument",
      defaultValue: "acoustic_grand_piano",
      options: SOUNDFONT_LIST.map((sf) => ({
        value: sf,
        label: sf.replace(/_/g, " "),
      })),
    },
  ],
  createDefaultConfig: (): SmplrConfig => ({
    type: "smplr",
    soundfont: "acoustic_grand_piano",
    gain: 1,
  }),
  engine: SmplrEngine as unknown as InstrumentEngineConstructor,
};
