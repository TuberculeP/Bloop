import type { InstrumentConfig } from "../utils/types";
import {
  AudioClipEngine,
  BasicSynthEngine,
  SmplrEngine,
  UndertaleEngine,
  EarthboundEngine,
  type InstrumentEngine,
} from "./engines";

export function createInstrumentEngine(
  audioContext: AudioContext,
  destination: AudioNode,
  config: InstrumentConfig,
): InstrumentEngine {
  switch (config.type) {
    case "basicSynth":
      return new BasicSynthEngine(audioContext, destination, config);

    case "smplr":
      return new SmplrEngine(audioContext, destination, config);

    case "elementarySynth":
      // Pour l'instant, fallback sur BasicSynth
      // TODO: Implémenter ElementarySynthEngine
      console.warn("ElementarySynth not yet implemented, using BasicSynth");
      return new BasicSynthEngine(audioContext, destination, {
        type: "basicSynth",
        oscillatorType: "sine",
        gain: config.gain,
      });

    case "undertale":
      return new UndertaleEngine(audioContext, destination, config);

    case "earthbound":
      return new EarthboundEngine(audioContext, destination, config);

    case "audioTrack":
      return new AudioClipEngine(audioContext, destination, config);

    default:
      throw new Error(`Unknown instrument type: ${(config as any).type}`);
  }
}

export function getDefaultConfigForType(
  type: InstrumentConfig["type"],
): InstrumentConfig {
  switch (type) {
    case "basicSynth":
      return {
        type: "basicSynth",
        oscillatorType: "sine",
        gain: 1,
      };

    case "smplr":
      return {
        type: "smplr",
        soundfont: "acoustic_grand_piano",
        gain: 1,
      };

    case "elementarySynth":
      return {
        type: "elementarySynth",
        preset: "default",
        gain: 1,
      };

    case "undertale":
      return {
        type: "undertale",
        instrument: "",
        gain: 1,
        attack: 0,
        decay: 0,
        sustain: 1,
        release: 0.3,
      };

    case "earthbound":
      return {
        type: "earthbound",
        instrument: "",
        gain: 1,
        attack: 0,
        decay: 0,
        sustain: 1,
        release: 0.3,
      };

    case "audioTrack":
      return {
        type: "audioTrack",
        gain: 1,
      };

    default:
      throw new Error(`Unknown instrument type: ${type}`);
  }
}
