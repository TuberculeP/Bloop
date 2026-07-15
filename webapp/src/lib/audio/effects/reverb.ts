import { createImpulseResponse } from "../config";
import type { EffectDefinition } from "./registry";
import type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";

const REVERB_PARAMS_META: EffectParamMeta[] = [
  {
    id: "amount",
    label: "Reverb",
    shortLabel: "Rvb",
    unit: "%",
    min: 0,
    max: 100,
    defaultValue: 0,
    toDisplay: (v) => `${Math.round(v)}%`,
  },
];

// L'IR est générée une seule fois (coûteux : Math.random() sur sampleRate*3
// échantillons) puis partagée en tant qu'AudioBuffer entre toutes les
// instances de reverb — chaque instance crée son propre ConvolverNode pointant
// vers ce même buffer, ce qui permet un contrôle indépendant par instance
// (pile réordonnable) sans régénérer l'IR à chaque ajout.
let sharedImpulse: { ctx: AudioContext; buffer: AudioBuffer } | null = null;

function getSharedImpulse(ctx: AudioContext): AudioBuffer {
  if (!sharedImpulse || sharedImpulse.ctx !== ctx) {
    sharedImpulse = { ctx, buffer: createImpulseResponse(ctx) };
  }
  return sharedImpulse.buffer;
}

function createReverb(
  audioContext: AudioContext,
  id: string,
  initialParams: Record<string, number> = {},
): EffectInstance {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  const reverbBoost = audioContext.createGain();

  convolver.buffer = getSharedImpulse(audioContext);
  reverbBoost.gain.value = 1.5;

  input.connect(dryGain).connect(output);
  input
    .connect(convolver)
    .connect(reverbBoost)
    .connect(wetGain)
    .connect(output);

  let amount = initialParams.amount ?? 0;

  const applyAmount = (value: number, ctx?: AudioContext) => {
    amount = value;
    const reverbAmount = value / 100;
    const dryValue = Math.max(0.001, 1 - reverbAmount * 0.5);
    if (!ctx) {
      dryGain.gain.value = dryValue;
      wetGain.gain.value = reverbAmount;
      return;
    }
    const now = ctx.currentTime;
    dryGain.gain.setTargetAtTime(dryValue, now, 0.01);
    if (reverbAmount < 0.001) {
      wetGain.gain.setValueAtTime(0, now);
    } else {
      wetGain.gain.setTargetAtTime(reverbAmount, now, 0.01);
    }
  };

  applyAmount(amount);

  const params: EffectParamDescriptor[] = [
    {
      ...REVERB_PARAMS_META[0],
      setValue: (value, ctx) => applyAmount(value, ctx),
      getValue: () => amount,
    },
  ];

  return {
    id,
    type: "reverb",
    input,
    output,
    getParams: () => params,
    getParam: (paramId) => params.find((p) => p.id === paramId),
    dispose: () => {
      input.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      convolver.disconnect();
      reverbBoost.disconnect();
      output.disconnect();
    },
  };
}

export const reverbDefinition: EffectDefinition = {
  type: "reverb",
  label: "Reverb",
  category: "spatial",
  params: REVERB_PARAMS_META,
  createDefaultParams: () => ({ amount: 0 }),
  create: createReverb,
};
