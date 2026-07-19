import type { InstrumentDefinition } from "../../instruments/registry";
import type { InstrumentEngineConstructor } from "../types";
import type { AudioTrackConfig } from "../../../utils/types";
import { AudioClipEngine } from "./AudioClipEngine";

export const audioClipDefinition: InstrumentDefinition = {
  type: "audioTrack",
  label: "Audio",
  icon: "🔊",
  description: "Piste audio pour samples et boucles",
  params: [],
  createDefaultConfig: (): AudioTrackConfig => ({
    type: "audioTrack",
    gain: 1,
  }),
  engine: AudioClipEngine as unknown as InstrumentEngineConstructor,
};
