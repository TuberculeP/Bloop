import type {
  InstrumentEngine,
  InstrumentEngineConstructor,
} from "../engines/types";
import type { InstrumentConfig } from "../../utils/types";
import type { InstrumentParamMeta } from "./types";

export interface InstrumentDefinition {
  type: string;
  label: string;
  icon?: string;
  description?: string;
  /** Absent du catalogue "ajouter une piste" / réglages génériques, sans être
   *  retiré du registre (résolution createInstrumentEngine reste possible). */
  hidden?: boolean;
  params: InstrumentParamMeta[];
  createDefaultConfig(): InstrumentConfig;
  engine: InstrumentEngineConstructor;
}

const registry = new Map<string, InstrumentDefinition>();

export function registerInstrument(def: InstrumentDefinition): void {
  registry.set(def.type, def);
}

export function getInstrumentDefinition(
  type: string,
): InstrumentDefinition | undefined {
  return registry.get(type);
}

export function listInstrumentDefinitions(): InstrumentDefinition[] {
  return [...registry.values()].filter((def) => !def.hidden);
}

export function createInstrumentEngine(
  audioContext: AudioContext,
  destination: AudioNode,
  config: InstrumentConfig,
): InstrumentEngine {
  const def = registry.get(config.type);
  if (!def) throw new Error(`Unknown instrument type: ${config.type}`);
  return new def.engine(audioContext, destination, config);
}

export function getDefaultConfigForType(type: string): InstrumentConfig {
  const def = registry.get(type);
  if (!def) throw new Error(`Unknown instrument type: ${type}`);
  return def.createDefaultConfig();
}
