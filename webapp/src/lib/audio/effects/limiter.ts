import { DEFAULT_LIMITER_CONFIG } from "../config";
import type { EffectDefinition } from "./registry";
import type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";

// Limiteur = compresseur configuré en brickwall (knee dur, ratio élevé,
// attack quasi instantané) : seuls threshold/release sont des réglages
// utilisateur, le reste est fixé en dur — comportement identique à l'ancien
// `applyLimiter` de audioBusStore.ts.
const FIXED_RATIO = 20;
const FIXED_KNEE = 0;
const FIXED_ATTACK = 0.001;

const LIMITER_PARAMS_META: EffectParamMeta[] = [
  {
    id: "threshold",
    label: "Threshold",
    unit: "dB",
    min: -100,
    max: 0,
    defaultValue: DEFAULT_LIMITER_CONFIG.threshold,
    toDisplay: (v) => `${v.toFixed(0)}dB`,
  },
  {
    id: "release",
    label: "Release",
    unit: "s",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_LIMITER_CONFIG.release,
    toDisplay: (v) => `${v.toFixed(2)}s`,
  },
];

function createLimiter(
  audioContext: AudioContext,
  id: string,
  initialParams: Record<string, number> = {},
): EffectInstance {
  const node = audioContext.createDynamicsCompressor();
  node.threshold.value =
    initialParams.threshold ?? DEFAULT_LIMITER_CONFIG.threshold;
  node.release.value = initialParams.release ?? DEFAULT_LIMITER_CONFIG.release;
  node.ratio.value = FIXED_RATIO;
  node.knee.value = FIXED_KNEE;
  node.attack.value = FIXED_ATTACK;

  const audioParams: Record<string, AudioParam> = {
    threshold: node.threshold,
    release: node.release,
  };

  const params: EffectParamDescriptor[] = LIMITER_PARAMS_META.map((meta) => ({
    ...meta,
    audioParam: audioParams[meta.id],
    getValue: () => audioParams[meta.id].value,
  }));

  return {
    id,
    type: "limiter",
    input: node,
    output: node,
    getParams: () => params,
    getParam: (paramId) => params.find((p) => p.id === paramId),
    dispose: () => node.disconnect(),
  };
}

export const limiterDefinition: EffectDefinition = {
  type: "limiter",
  label: "Limiteur",
  category: "dynamics",
  params: LIMITER_PARAMS_META,
  createDefaultParams: () =>
    Object.fromEntries(LIMITER_PARAMS_META.map((p) => [p.id, p.defaultValue])),
  create: createLimiter,
};
