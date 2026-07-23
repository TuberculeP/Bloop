// Port de voice-dx7.js (dx7-synth-js, MIT, Matt Montag)
import type { Dx7Patch } from "../../../../utils/types";
import { EnvelopeDX7 } from "./envelopeDx7";
import { LfoDX7 } from "./lfoDx7";
import { Operator } from "./operator";
import type { RuntimeOperatorParams, RuntimeParams } from "./runtimeTypes";

const OUTPUT_LEVEL_TABLE = [
  0.0, 0.000337, 0.000476, 0.000674, 0.000952, 0.001235, 0.001602, 0.001905,
  0.002265, 0.002694, 0.003204, 0.00381, 0.004531, 0.005388, 0.006408, 0.00762,
  0.00831, 0.009062, 0.010776, 0.011752, 0.013975, 0.01524, 0.016619, 0.018123,
  0.019764, 0.021552, 0.023503, 0.02563, 0.02795, 0.03048, 0.033238, 0.036247,
  0.039527, 0.043105, 0.047006, 0.051261, 0.0559, 0.06096, 0.066477, 0.072494,
  0.079055, 0.08621, 0.094012, 0.102521, 0.1118, 0.121919, 0.132954, 0.144987,
  0.15811, 0.17242, 0.188025, 0.205043, 0.223601, 0.243838, 0.265907, 0.289974,
  0.316219, 0.344839, 0.37605, 0.410085, 0.447201, 0.487676, 0.531815, 0.579948,
  0.632438, 0.689679, 0.7521, 0.820171, 0.894403, 0.975353, 1.06363, 1.159897,
  1.264876, 1.379357, 1.5042, 1.640341, 1.788805, 1.950706, 2.12726, 2.319793,
  2.529752, 2.758714, 3.008399, 3.280683, 3.57761, 3.901411, 4.254519, 4.639586,
  5.059505, 5.517429, 6.016799, 6.561366, 7.15522, 7.802823, 8.509039, 9.279172,
  10.11901, 11.03486, 12.0336, 13.12273,
];

export interface Dx7Algorithm {
  outputMix: number[];
  modulationMatrix: number[][];
}

// Exporté pour l'interface (diagramme de routing) — lecture seule, purement
// descriptif, n'affecte pas le rendu DSP ci-dessous.
export const ALGORITHMS: Dx7Algorithm[] = [
  { outputMix: [0, 2], modulationMatrix: [[1], [], [3], [4], [5], [5]] }, // 1
  { outputMix: [0, 2], modulationMatrix: [[1], [1], [3], [4], [5], []] }, // 2
  { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4], [5], [5]] }, // 3
  { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4], [5], [3]] }, // 4
  { outputMix: [0, 2, 4], modulationMatrix: [[1], [], [3], [], [5], [5]] }, // 5
  { outputMix: [0, 2, 4], modulationMatrix: [[1], [], [3], [], [5], [4]] }, // 6
  { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4], [], [5], [5]] }, // 7
  { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4], [3], [5], []] }, // 8
  { outputMix: [0, 2], modulationMatrix: [[1], [1], [3, 4], [], [5], []] }, // 9
  { outputMix: [0, 3], modulationMatrix: [[1], [2], [2], [4, 5], [], []] }, // 10
  { outputMix: [0, 3], modulationMatrix: [[1], [2], [], [4, 5], [], [5]] }, // 11
  { outputMix: [0, 2], modulationMatrix: [[1], [1], [3, 4, 5], [], [], []] }, // 12
  { outputMix: [0, 2], modulationMatrix: [[1], [], [3, 4, 5], [], [], [5]] }, // 13
  { outputMix: [0, 2], modulationMatrix: [[1], [], [3], [4, 5], [], [5]] }, // 14
  { outputMix: [0, 2], modulationMatrix: [[1], [1], [3], [4, 5], [], []] }, // 15
  { outputMix: [0], modulationMatrix: [[1, 2, 4], [], [3], [], [5], [5]] }, // 16
  { outputMix: [0], modulationMatrix: [[1, 2, 4], [1], [3], [], [5], []] }, // 17
  { outputMix: [0], modulationMatrix: [[1, 2, 3], [], [2], [4], [5], []] }, // 18
  { outputMix: [0, 3, 4], modulationMatrix: [[1], [2], [], [5], [5], [5]] }, // 19
  { outputMix: [0, 1, 3], modulationMatrix: [[2], [2], [2], [4, 5], [], []] }, // 20
  { outputMix: [0, 1, 3, 4], modulationMatrix: [[2], [2], [2], [5], [5], []] }, // 21
  { outputMix: [0, 2, 3, 4], modulationMatrix: [[1], [], [5], [5], [5], [5]] }, // 22
  { outputMix: [0, 1, 3, 4], modulationMatrix: [[], [2], [], [5], [5], [5]] }, // 23
  {
    outputMix: [0, 1, 2, 3, 4],
    modulationMatrix: [[], [], [5], [5], [5], [5]],
  }, // 24
  { outputMix: [0, 1, 2, 3, 4], modulationMatrix: [[], [], [], [5], [5], [5]] }, // 25
  { outputMix: [0, 1, 3], modulationMatrix: [[], [2], [], [4, 5], [], [5]] }, // 26
  { outputMix: [0, 1, 3], modulationMatrix: [[], [2], [2], [4, 5], [], []] }, // 27
  { outputMix: [0, 2, 5], modulationMatrix: [[1], [], [3], [4], [4], []] }, // 28
  { outputMix: [0, 1, 2, 4], modulationMatrix: [[], [], [3], [], [5], [5]] }, // 29
  { outputMix: [0, 1, 2, 5], modulationMatrix: [[], [], [3], [4], [4], []] }, // 30
  { outputMix: [0, 1, 2, 3, 4], modulationMatrix: [[], [], [], [], [5], [5]] }, // 31
  {
    outputMix: [0, 1, 2, 3, 4, 5],
    modulationMatrix: [[], [], [], [], [], [5]],
  }, // 32
];

let params: RuntimeParams | null = null;

export class FMVoice {
  down = true;
  note: number;
  frequency: number;
  velocity: number;
  operators: Operator[] = new Array(6);

  static aftertouch = 0;
  static mod = 0;
  static bend = 0;

  constructor(note: number, velocity: number) {
    this.note = note;
    this.frequency = FMVoice.frequencyFromNoteNumber(this.note);
    this.velocity = velocity;

    const runtimeParams = params as RuntimeParams;
    for (let i = 0; i < 6; i++) {
      const opParams = runtimeParams.operators[i];
      const op = new Operator(
        opParams,
        this.frequency,
        new EnvelopeDX7(opParams.levels, opParams.rates),
        new LfoDX7(opParams),
      );
      op.outputLevel =
        (1 + (this.velocity - 1) * (opParams.velocitySens / 7)) *
        opParams.outputLevel;
      this.operators[i] = op;
    }
    this.updatePitchBend();
  }

  static frequencyFromNoteNumber(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  static setParams(globalParams: RuntimeParams): void {
    LfoDX7.setParams(globalParams);
    params = globalParams;
  }

  static pitchBend(value: number): void {
    FMVoice.bend = value;
  }

  render(): [number, number] {
    const runtimeParams = params as RuntimeParams;
    const algorithmIdx = runtimeParams.algorithm - 1;
    const { modulationMatrix, outputMix } = ALGORITHMS[algorithmIdx];
    const outputScaling = 1 / outputMix.length;
    let outputL = 0;
    let outputR = 0;

    for (let i = 5; i >= 0; i--) {
      let mod = 0;
      if (runtimeParams.operators[i].enabled) {
        const modulators = modulationMatrix[i];
        for (let j = 0; j < modulators.length; j++) {
          const modulator = modulators[j];
          if (runtimeParams.operators[modulator].enabled) {
            const modOp = this.operators[modulator];
            if (modulator === i) {
              // L'opérateur se module lui-même : ratio de feedback
              mod += modOp.val * runtimeParams.fbRatio;
            } else {
              mod += modOp.val * modOp.outputLevel;
            }
          }
        }
      }
      this.operators[i].render(mod);
    }

    for (let k = 0; k < outputMix.length; k++) {
      if (runtimeParams.operators[outputMix[k]].enabled) {
        const carrier = this.operators[outputMix[k]];
        const carrierParams = runtimeParams.operators[outputMix[k]];
        const carrierLevel = carrier.val * carrier.outputLevel;
        outputL += carrierLevel * carrierParams.ampL;
        outputR += carrierLevel * carrierParams.ampR;
      }
    }
    return [outputL * outputScaling, outputR * outputScaling];
  }

  noteOff(): void {
    this.down = false;
    for (let i = 0; i < 6; i++) {
      this.operators[i].noteOff();
    }
  }

  updatePitchBend(): void {
    const frequency = FMVoice.frequencyFromNoteNumber(this.note + FMVoice.bend);
    for (let i = 0; i < 6; i++) {
      this.operators[i].updateFrequency(frequency);
    }
  }

  isFinished(): boolean {
    const runtimeParams = params as RuntimeParams;
    const outputMix = ALGORITHMS[runtimeParams.algorithm - 1].outputMix;
    for (let i = 0; i < outputMix.length; i++) {
      if (!this.operators[outputMix[i]].isFinished()) return false;
    }
    return true;
  }
}

function mapOutputLevel(volume: number): number {
  const idx = Math.min(99, Math.max(0, Math.floor(volume)));
  return OUTPUT_LEVEL_TABLE[idx] * 1.27;
}

// Convertit un patch persisté (champs bruts DX7) en RuntimeParams consommables
// par FMVoice/Operator/LfoDX7 — équivalent de ce que faisait l'UI d'origine via
// FMVoice.setOutputLevel/setPan/updateFrequency/setFeedback à chaque chargement
// de patch.
export function buildRuntimeParams(patch: Dx7Patch): RuntimeParams {
  const operators: RuntimeOperatorParams[] = patch.operators.map((op) => {
    const runtimeOp: RuntimeOperatorParams = {
      ...op,
      outputLevel: mapOutputLevel(op.volume),
      ampL: Math.cos(((Math.PI / 2) * (op.pan + 50)) / 100),
      ampR: Math.sin(((Math.PI / 2) * (op.pan + 50)) / 100),
    };
    if (op.oscMode === 0) {
      const freqCoarse = op.freqCoarse || 0.5; // 0 -> ratio de 0.5
      runtimeOp.freqRatio = freqCoarse * (1 + op.freqFine / 100);
    } else {
      runtimeOp.freqFixed =
        Math.pow(10, op.freqCoarse % 4) * (1 + (op.freqFine / 99) * 8.772);
    }
    return runtimeOp;
  });

  return {
    algorithm: patch.algorithm,
    fbRatio: Math.pow(2, patch.feedback - 7),
    controllerModVal: 0,
    lfoSpeed: patch.lfoSpeed,
    lfoDelay: patch.lfoDelay,
    lfoPitchModDepth: patch.lfoPitchModDepth,
    lfoAmpModDepth: patch.lfoAmpModDepth,
    lfoPitchModSens: patch.lfoPitchModSens,
    lfoWaveform: patch.lfoWaveform,
    operators,
  };
}
