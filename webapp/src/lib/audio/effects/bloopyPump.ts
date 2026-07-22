import type { TimeSignature } from "../../utils/types";
import { TICKS_PER_BEAT, ticksPerBar } from "../timeGrid";
import type { EffectDefinition } from "./registry";
import type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";

const RATE_LABELS = ["1/1", "1/2", "1/4", "1/8"] as const;
const CURVE_EXPONENTIAL = 0;
const CURVE_LINEAR = 1;

const BLOOPY_PUMP_PARAMS_META: EffectParamMeta[] = [
  {
    id: "depth",
    label: "Depth",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 60,
    toDisplay: (v) => `${Math.round(v)}%`,
  },
  {
    id: "rate",
    label: "Rate",
    unit: "",
    min: 0,
    max: 3,
    step: 1,
    defaultValue: 2, // 1/4
    options: RATE_LABELS.map((label, value) => ({ value, label })),
  },
  {
    id: "curve",
    label: "Curve",
    unit: "",
    min: 0,
    max: 1,
    step: 1,
    defaultValue: CURVE_EXPONENTIAL,
    options: [
      { value: CURVE_EXPONENTIAL, label: "Exponentielle" },
      { value: CURVE_LINEAR, label: "Linéaire" },
    ],
  },
];

function ticksPerTriggerForRate(
  rate: number,
  timeSignature: TimeSignature,
): number {
  const barTicks = ticksPerBar(timeSignature);
  switch (rate) {
    case 0: // 1/1 : une fois par mesure
      return barTicks;
    case 1: // 1/2
      return barTicks / 2;
    case 3: // 1/8
      return TICKS_PER_BEAT / 2;
    default: // 1/4 : une fois par temps
      return TICKS_PER_BEAT;
  }
}

function createBloopyPump(
  audioContext: AudioContext,
  id: string,
  initialParams: Record<string, number> = {},
): EffectInstance {
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1;

  const state: Record<string, number> = {};
  for (const meta of BLOOPY_PUMP_PARAMS_META) {
    state[meta.id] = initialParams[meta.id] ?? meta.defaultValue;
  }

  const triggerEnvelope = (startTime: number, durationSec: number) => {
    const gain = gainNode.gain;
    const minGain = Math.max(0.0001, 1 - state.depth / 100);

    gain.cancelScheduledValues(startTime);
    gain.setValueAtTime(minGain, startTime);

    if (state.curve === CURVE_LINEAR) {
      gain.linearRampToValueAtTime(1, startTime + durationSec);
    } else {
      // Exponentielle (défaut) : remontée asymptotique vers 1, constante de
      // temps choisie pour être proche de 1 avant le prochain trigger.
      gain.setTargetAtTime(1, startTime, durationSec / 4);
    }
  };

  const onBeatBoundary = (
    tick: number,
    timeSignature: TimeSignature,
    tempo: number,
  ): void => {
    const ticksPerTrigger = ticksPerTriggerForRate(state.rate, timeSignature);
    if (ticksPerTrigger <= 0 || tick % ticksPerTrigger !== 0) return;
    const durationSec = (ticksPerTrigger / TICKS_PER_BEAT) * (60 / tempo);
    triggerEnvelope(audioContext.currentTime, durationSec);
  };

  const params: EffectParamDescriptor[] = BLOOPY_PUMP_PARAMS_META.map(
    (meta) => ({
      ...meta,
      setValue: (value) => {
        state[meta.id] = value;
      },
      getValue: () => state[meta.id],
    }),
  );

  return {
    id,
    type: "bloopyPump",
    input: gainNode,
    output: gainNode,
    getParams: () => params,
    getParam: (paramId) => params.find((p) => p.id === paramId),
    dispose: () => gainNode.disconnect(),
    onBeatBoundary,
  };
}

export const bloopyPumpDefinition: EffectDefinition = {
  type: "bloopyPump",
  label: "Bloopy Pump",
  category: "dynamics",
  params: BLOOPY_PUMP_PARAMS_META,
  createDefaultParams: () =>
    Object.fromEntries(
      BLOOPY_PUMP_PARAMS_META.map((p) => [p.id, p.defaultValue]),
    ),
  create: createBloopyPump,
};
