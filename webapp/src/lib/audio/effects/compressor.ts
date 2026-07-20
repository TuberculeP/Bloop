import { DEFAULT_COMPRESSOR_CONFIG } from "../config";
import type { EffectDefinition } from "./registry";
import type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";

const COMPRESSOR_PARAMS_META: EffectParamMeta[] = [
  {
    id: "threshold",
    label: "Threshold",
    unit: "dB",
    min: -100,
    max: 0,
    defaultValue: DEFAULT_COMPRESSOR_CONFIG.threshold,
    toDisplay: (v) => `${v.toFixed(0)}dB`,
  },
  {
    id: "ratio",
    label: "Ratio",
    unit: ":1",
    min: 1,
    max: 20,
    step: 0.5,
    defaultValue: DEFAULT_COMPRESSOR_CONFIG.ratio,
    toDisplay: (v) => `${v.toFixed(1)}:1`,
  },
  {
    id: "attack",
    label: "Attack",
    unit: "s",
    min: 0,
    max: 1,
    step: 0.001,
    defaultValue: DEFAULT_COMPRESSOR_CONFIG.attack,
    toDisplay: (v) => `${v.toFixed(3)}s`,
  },
  {
    id: "release",
    label: "Release",
    unit: "s",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_COMPRESSOR_CONFIG.release,
    toDisplay: (v) => `${v.toFixed(2)}s`,
  },
  {
    id: "knee",
    label: "Knee",
    unit: "dB",
    min: 0,
    max: 40,
    defaultValue: DEFAULT_COMPRESSOR_CONFIG.knee,
    toDisplay: (v) => `${v.toFixed(0)}dB`,
  },
];

function createCompressor(
  audioContext: AudioContext,
  id: string,
  initialParams: Record<string, number> = {},
): EffectInstance {
  const node = audioContext.createDynamicsCompressor();
  node.threshold.value =
    initialParams.threshold ?? DEFAULT_COMPRESSOR_CONFIG.threshold;
  node.ratio.value = initialParams.ratio ?? DEFAULT_COMPRESSOR_CONFIG.ratio;
  node.attack.value = initialParams.attack ?? DEFAULT_COMPRESSOR_CONFIG.attack;
  node.release.value =
    initialParams.release ?? DEFAULT_COMPRESSOR_CONFIG.release;
  node.knee.value = initialParams.knee ?? DEFAULT_COMPRESSOR_CONFIG.knee;

  const audioParams: Record<string, AudioParam> = {
    threshold: node.threshold,
    ratio: node.ratio,
    attack: node.attack,
    release: node.release,
    knee: node.knee,
  };

  const params: EffectParamDescriptor[] = COMPRESSOR_PARAMS_META.map(
    (meta) => ({
      ...meta,
      audioParam: audioParams[meta.id],
      getValue: () => audioParams[meta.id].value,
    }),
  );

  return {
    id,
    type: "compressor",
    input: node,
    output: node,
    getParams: () => params,
    getParam: (paramId) => params.find((p) => p.id === paramId),
    dispose: () => node.disconnect(),
  };
}

export const compressorDefinition: EffectDefinition = {
  type: "compressor",
  label: "Compresseur",
  category: "dynamics",
  params: COMPRESSOR_PARAMS_META,
  createDefaultParams: () =>
    Object.fromEntries(
      COMPRESSOR_PARAMS_META.map((p) => [p.id, p.defaultValue]),
    ),
  create: createCompressor,
};
