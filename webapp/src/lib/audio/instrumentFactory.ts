import type { InstrumentConfig } from "../utils/types";
import type { InstrumentEngine } from "./engines/types";
import { BasicSynthEngine } from "./engines";
import {
  createInstrumentEngine as createRegisteredInstrumentEngine,
  getDefaultConfigForType as getRegisteredDefaultConfigForType,
} from "./instruments";

/**
 * `elementarySynth` n'a jamais eu de moteur réel : fallback historique vers
 * BasicSynth, conservé hors registre uniquement pour les pistes déjà
 * sauvegardées avec ce type (plus proposé à la création, voir
 * AddTrackButton.vue / listInstrumentDefinitions()).
 */
function createElementarySynthFallback(
  audioContext: AudioContext,
  destination: AudioNode,
  config: InstrumentConfig,
): InstrumentEngine {
  console.warn("ElementarySynth not yet implemented, using BasicSynth");
  return new BasicSynthEngine(audioContext, destination, {
    type: "basicSynth",
    oscillatorType: "sine",
    gain: config.gain,
  });
}

export function createInstrumentEngine(
  audioContext: AudioContext,
  destination: AudioNode,
  config: InstrumentConfig,
): InstrumentEngine {
  if (config.type === "elementarySynth") {
    return createElementarySynthFallback(audioContext, destination, config);
  }
  return createRegisteredInstrumentEngine(audioContext, destination, config);
}

export function getDefaultConfigForType(type: string): InstrumentConfig {
  if (type === "elementarySynth") {
    return { type: "elementarySynth", preset: "default", gain: 1 };
  }
  return getRegisteredDefaultConfigForType(type);
}
