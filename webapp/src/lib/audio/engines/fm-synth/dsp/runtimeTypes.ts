import type { Dx7Operator } from "../../../../utils/types";

// Forme "runtime" d'un opérateur : les champs bruts du patch (stockés/persistés)
// étendus des valeurs dérivées calculées une fois au chargement du patch
// (équivalent de FMVoice.setOutputLevel/setPan/updateFrequency dans l'app d'origine).
export interface RuntimeOperatorParams extends Dx7Operator {
  outputLevel: number;
  ampL: number;
  ampR: number;
  freqRatio?: number;
  freqFixed?: number;
}

export interface RuntimeParams {
  algorithm: number;
  fbRatio: number;
  controllerModVal: number;
  lfoSpeed: number;
  lfoDelay: number;
  lfoPitchModDepth: number;
  lfoAmpModDepth: number;
  lfoPitchModSens: number;
  lfoWaveform: number;
  operators: RuntimeOperatorParams[];
}
