import type { EffectInstance, EffectParamMeta } from "./types";

export interface EffectDefinition {
  type: string;
  label: string;
  category: "eq" | "dynamics" | "spatial";
  /** Métadonnées statiques (label/bornes/unité) — pour l'UI, sans AudioContext. */
  params: EffectParamMeta[];
  createDefaultParams(): Record<string, number>;
  create(
    audioContext: AudioContext,
    id: string,
    initialParams?: Record<string, number>,
  ): EffectInstance;
}

const registry = new Map<string, EffectDefinition>();

export function registerEffect(def: EffectDefinition): void {
  registry.set(def.type, def);
}

export function getEffectDefinition(
  type: string,
): EffectDefinition | undefined {
  return registry.get(type);
}

export function listEffectDefinitions(): EffectDefinition[] {
  return [...registry.values()];
}

export function createEffectInstance(
  audioContext: AudioContext,
  type: string,
  id: string,
  initialParams?: Record<string, number>,
): EffectInstance {
  const def = registry.get(type);
  if (!def) throw new Error(`Unknown effect type: ${type}`);
  return def.create(audioContext, id, initialParams);
}
