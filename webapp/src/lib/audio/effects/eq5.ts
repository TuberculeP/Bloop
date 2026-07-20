import {
  createEQFilterChain,
  DEFAULT_EQ_BANDS,
  EQ_GAIN_MIN,
  EQ_GAIN_MAX,
} from "../config";
import type { EffectDefinition } from "./registry";
import type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";

const gainParamId = (bandId: string) => `${bandId}_gain`;

const EQ5_PARAMS_META: EffectParamMeta[] = DEFAULT_EQ_BANDS.map((band) => ({
  id: gainParamId(band.id),
  label: band.label,
  shortLabel: band.label,
  unit: "dB",
  min: EQ_GAIN_MIN,
  max: EQ_GAIN_MAX,
  defaultValue: 0,
  toDisplay: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}dB`,
}));

function createEQ5(
  audioContext: AudioContext,
  id: string,
  initialParams: Record<string, number> = {},
): EffectInstance {
  const { filters, chain } = createEQFilterChain(
    audioContext,
    DEFAULT_EQ_BANDS,
  );

  for (const band of DEFAULT_EQ_BANDS) {
    const value = initialParams[gainParamId(band.id)];
    if (value !== undefined) {
      filters.get(band.id)!.gain.value = value;
    }
  }

  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].connect(chain[i + 1]);
  }

  const params: EffectParamDescriptor[] = DEFAULT_EQ_BANDS.map((band, i) => {
    const filter = filters.get(band.id)!;
    return {
      ...EQ5_PARAMS_META[i],
      audioParam: filter.gain,
      getValue: () => filter.gain.value,
    };
  });

  return {
    id,
    type: "eq5",
    input: chain[0],
    output: chain[chain.length - 1],
    getParams: () => params,
    getParam: (paramId) => params.find((p) => p.id === paramId),
    dispose: () => chain.forEach((filter) => filter.disconnect()),
  };
}

export const eq5Definition: EffectDefinition = {
  type: "eq5",
  label: "Égaliseur 5 bandes",
  category: "eq",
  params: EQ5_PARAMS_META,
  createDefaultParams: () =>
    Object.fromEntries(EQ5_PARAMS_META.map((p) => [p.id, p.defaultValue])),
  create: createEQ5,
};
