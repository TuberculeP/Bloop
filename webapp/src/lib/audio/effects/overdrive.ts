import type { EffectDefinition } from "./registry";
import type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";

// Facteur de compensation appliqué à la courbe de waveshaping : la formule
// classique de saturation ci-dessous atténue le signal à ×1/3 quand
// drive=0 (c'est un artefact de sa forme, pas un choix voulu) — sans ce
// facteur, ajouter l'effet à ses valeurs par défaut changerait déjà le son.
const DRIVE_CURVE_MAKEUP = 3;
const CURVE_SAMPLES = 1024;

const TONE_MIN_FREQ = 800;
const TONE_MAX_FREQ = 18000;

const OVERDRIVE_PARAMS_META: EffectParamMeta[] = [
  {
    id: "drive",
    label: "Drive",
    unit: "%",
    min: 0,
    max: 100,
    defaultValue: 0,
    toDisplay: (v) => `${Math.round(v)}%`,
  },
  {
    id: "tone",
    label: "Tone",
    unit: "%",
    min: 0,
    max: 100,
    defaultValue: 100,
    toDisplay: (v) => `${Math.round(v)}%`,
  },
  {
    id: "gain",
    label: "Gain",
    unit: "dB",
    min: -24,
    max: 24,
    defaultValue: 0,
    toDisplay: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}dB`,
  },
];

// Courbe de saturation classique (soft/hard clip progressif selon k) :
// https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode
function makeDriveCurve(drive: number): Float32Array {
  const k = drive;
  const deg = Math.PI / 180;
  const curve = new Float32Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i * 2) / CURVE_SAMPLES - 1;
    curve[i] =
      (((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))) *
      DRIVE_CURVE_MAKEUP;
  }
  return curve;
}

function toneToFrequency(tone: number): number {
  const t = tone / 100;
  return TONE_MIN_FREQ * (TONE_MAX_FREQ / TONE_MIN_FREQ) ** t;
}

function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}

function createOverdrive(
  audioContext: AudioContext,
  id: string,
  initialParams: Record<string, number> = {},
): EffectInstance {
  const shaper = audioContext.createWaveShaper();
  shaper.oversample = "4x";

  const toneFilter = audioContext.createBiquadFilter();
  toneFilter.type = "lowpass";
  toneFilter.Q.value = 0.7;

  const outputGain = audioContext.createGain();

  shaper.connect(toneFilter).connect(outputGain);

  let drive = initialParams.drive ?? 0;
  let tone = initialParams.tone ?? 100;
  let gain = initialParams.gain ?? 0;

  shaper.curve = makeDriveCurve(drive);
  toneFilter.frequency.value = toneToFrequency(tone);
  outputGain.gain.value = dbToLinear(gain);

  const applyDrive = (value: number) => {
    drive = value;
    shaper.curve = makeDriveCurve(value);
  };

  const applyTone = (value: number, ctx?: AudioContext) => {
    tone = value;
    const freq = toneToFrequency(value);
    if (!ctx) {
      toneFilter.frequency.value = freq;
      return;
    }
    toneFilter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01);
  };

  const applyGain = (value: number, ctx?: AudioContext) => {
    gain = value;
    const linear = dbToLinear(value);
    if (!ctx) {
      outputGain.gain.value = linear;
      return;
    }
    outputGain.gain.setTargetAtTime(linear, ctx.currentTime, 0.01);
  };

  const params: EffectParamDescriptor[] = [
    {
      ...OVERDRIVE_PARAMS_META[0],
      setValue: (value) => applyDrive(value),
      getValue: () => drive,
    },
    {
      ...OVERDRIVE_PARAMS_META[1],
      setValue: (value, ctx) => applyTone(value, ctx),
      getValue: () => tone,
    },
    {
      ...OVERDRIVE_PARAMS_META[2],
      setValue: (value, ctx) => applyGain(value, ctx),
      getValue: () => gain,
    },
  ];

  return {
    id,
    type: "overdrive",
    input: shaper,
    output: outputGain,
    getParams: () => params,
    getParam: (paramId) => params.find((p) => p.id === paramId),
    dispose: () => {
      shaper.disconnect();
      toneFilter.disconnect();
      outputGain.disconnect();
    },
  };
}

export const overdriveDefinition: EffectDefinition = {
  type: "overdrive",
  label: "Overdrive",
  category: "distortion",
  params: OVERDRIVE_PARAMS_META,
  createDefaultParams: () =>
    Object.fromEntries(
      OVERDRIVE_PARAMS_META.map((p) => [p.id, p.defaultValue]),
    ),
  create: createOverdrive,
};
