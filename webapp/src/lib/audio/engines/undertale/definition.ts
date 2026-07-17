import type { InstrumentDefinition } from "../../instruments/registry";
import type { InstrumentEngineConstructor } from "../types";
import type { UndertaleConfig } from "../../../utils/types";
import { UndertaleEngine } from "./UndertaleEngine";

export const undertaleDefinition: InstrumentDefinition = {
  type: "undertale",
  label: "Undertale",
  icon: "💀",
  description: "Soundfont Undertale (plusieurs presets)",
  params: [
    {
      kind: "enum",
      id: "instrument",
      label: "Preset Undertale",
      defaultValue: "",
      options: "dynamic",
    },
    {
      kind: "number",
      id: "attack",
      label: "A",
      min: 0,
      max: 2,
      step: 0.01,
      defaultValue: 0,
      toDisplay: (value) => `${value.toFixed(2)}s`,
    },
    {
      kind: "number",
      id: "decay",
      label: "D",
      min: 0,
      max: 2,
      step: 0.01,
      defaultValue: 0,
      toDisplay: (value) => `${value.toFixed(2)}s`,
    },
    {
      kind: "number",
      id: "sustain",
      label: "S",
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 1,
      toDisplay: (value) => `${(value * 100).toFixed(0)}%`,
    },
    {
      kind: "number",
      id: "release",
      label: "R",
      min: 0,
      max: 3,
      step: 0.01,
      defaultValue: 0.3,
      toDisplay: (value) => `${value.toFixed(2)}s`,
    },
  ],
  createDefaultConfig: (): UndertaleConfig => ({
    type: "undertale",
    instrument: "",
    gain: 1,
    attack: 0,
    decay: 0,
    sustain: 1,
    release: 0.3,
  }),
  engine: UndertaleEngine as unknown as InstrumentEngineConstructor,
};
