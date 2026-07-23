// Port de lfo-dx7.js (dx7-synth-js, MIT, Matt Montag)
import { dspConfig } from "./config";
import type { RuntimeOperatorParams, RuntimeParams } from "./runtimeTypes";

const PERIOD = Math.PI * 2;
const PERIOD_HALF = PERIOD / 2;
const PERIOD_RECIP = 1 / PERIOD;
const LFO_SAMPLE_PERIOD = 100;

// see https://github.com/smbolton/hexter/tree/master/src/dx7_voice.c#L1002
const LFO_FREQUENCY_TABLE = [
  0.062506, 0.124815, 0.311474, 0.435381, 0.619784, 0.744396, 0.930495, 1.11639,
  1.28422, 1.49688, 1.56783, 1.738994, 1.910158, 2.081322, 2.252486, 2.42365,
  2.580668, 2.737686, 2.894704, 3.051722, 3.20874, 3.36682, 3.5249, 3.68298,
  3.84106, 3.99914, 4.15942, 4.3197, 4.47998, 4.64026, 4.80054, 4.953584,
  5.106628, 5.259672, 5.412716, 5.56576, 5.724918, 5.884076, 6.043234, 6.202392,
  6.36155, 6.520044, 6.678538, 6.837032, 6.995526, 7.15402, 7.3005, 7.44698,
  7.59346, 7.73994, 7.88642, 8.020588, 8.154756, 8.288924, 8.423092, 8.55726,
  8.712624, 8.867988, 9.023352, 9.178716, 9.33408, 9.669644, 10.005208,
  10.340772, 10.676336, 11.0119, 11.96368, 12.91546, 13.86724, 14.81902,
  15.7708, 16.64024, 17.50968, 18.37912, 19.24856, 20.118, 21.0407, 21.9634,
  22.8861, 23.8088, 24.7315, 25.75974, 26.78798, 27.81622, 28.84446, 29.8727,
  31.2282, 32.5837, 33.9392, 35.2947, 36.6502, 37.81248, 38.97476, 40.13704,
  41.29932, 42.4616, 43.6398, 44.818, 45.9962, 47.1744, 47.1744, 47.1744,
  47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744,
  47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744,
  47.1744, 47.1744, 47.1744, 47.1744, 47.1744, 47.1744,
];

const LFO_PITCH_MOD_TABLE = [
  0, 0.0264, 0.0534, 0.0889, 0.1612, 0.2769, 0.4967, 1,
];

const LFO_MODE_TRIANGLE = 0,
  LFO_MODE_SAW_DOWN = 1,
  LFO_MODE_SAW_UP = 2,
  LFO_MODE_SQUARE = 3,
  LFO_MODE_SINE = 4,
  LFO_MODE_SAMPLE_HOLD = 5;

const LFO_DELAY_ONSET = 0,
  LFO_DELAY_RAMP = 1,
  LFO_DELAY_COMPLETE = 2;

// État statique partagé par toutes les instances (un seul patch actif à la fois,
// comme dans l'original — voir FMVoice.setParams).
let phaseStep = 0;
let ampModDepth = 0;
let sampleHoldRandom = 0;
const delayTimes = [0, 0, 0];
const delayIncrements = [0, 0, 0];
const delayVals = [0, 0, 1];
let params: RuntimeParams | null = null;

export class LfoDX7 {
  private phase = 0;
  private pitchVal = 0;
  private counter = 0;
  private ampVal = 1;
  private ampValTarget = 1;
  private ampIncrement = 0;
  private delayVal = 0;
  private delayState = LFO_DELAY_ONSET;

  constructor(private opParams: RuntimeOperatorParams) {
    LfoDX7.update();
  }

  render(): number {
    if (!params) return this.pitchVal;
    let amp = 0;
    if (this.counter % LFO_SAMPLE_PERIOD === 0) {
      switch (params.lfoWaveform) {
        case LFO_MODE_TRIANGLE:
          amp =
            this.phase < PERIOD_HALF
              ? 4 * this.phase * PERIOD_RECIP - 1
              : 3 - 4 * this.phase * PERIOD_RECIP;
          break;
        case LFO_MODE_SAW_DOWN:
          amp = 1 - 2 * this.phase * PERIOD_RECIP;
          break;
        case LFO_MODE_SAW_UP:
          amp = 2 * this.phase * PERIOD_RECIP - 1;
          break;
        case LFO_MODE_SQUARE:
          amp = this.phase < PERIOD_HALF ? -1 : 1;
          break;
        case LFO_MODE_SINE:
          amp = Math.sin(this.phase);
          break;
        case LFO_MODE_SAMPLE_HOLD:
          amp = sampleHoldRandom;
          break;
      }

      switch (this.delayState) {
        case LFO_DELAY_ONSET:
        case LFO_DELAY_RAMP:
          this.delayVal += delayIncrements[this.delayState];
          if (this.counter / LFO_SAMPLE_PERIOD > delayTimes[this.delayState]) {
            this.delayState++;
            this.delayVal = delayVals[this.delayState];
          }
          break;
        case LFO_DELAY_COMPLETE:
          break;
      }

      amp *= this.delayVal;
      const pitchModDepth =
        1 +
        LFO_PITCH_MOD_TABLE[params.lfoPitchModSens] *
          (params.controllerModVal + params.lfoPitchModDepth / 99);
      this.pitchVal = Math.pow(pitchModDepth, amp);

      const ampSensDepth = Math.abs(this.opParams.lfoAmpModSens) * 0.333333;
      const phase = this.opParams.lfoAmpModSens > 0 ? 1 : -1;
      this.ampValTarget =
        1 -
        (ampModDepth + params.controllerModVal) *
          ampSensDepth *
          (amp * phase + 1) *
          0.5;
      this.ampIncrement = (this.ampValTarget - this.ampVal) / LFO_SAMPLE_PERIOD;
      this.phase += phaseStep;
      if (this.phase >= PERIOD) {
        sampleHoldRandom = 1 - Math.random() * 2;
        this.phase -= PERIOD;
      }
    }
    this.counter++;
    return this.pitchVal;
  }

  renderAmp(): number {
    this.ampVal += this.ampIncrement;
    return this.ampVal;
  }

  static setParams(globalParams: RuntimeParams): void {
    params = globalParams;
  }

  static update(): void {
    if (!params) return;
    const frequency = LFO_FREQUENCY_TABLE[params.lfoSpeed];
    const lfoRate = dspConfig.sampleRate / LFO_SAMPLE_PERIOD;
    phaseStep = (PERIOD * frequency) / lfoRate;
    ampModDepth = params.lfoAmpModDepth * 0.01;
    delayTimes[LFO_DELAY_ONSET] =
      (lfoRate * 0.001753 * Math.pow(params.lfoDelay, 3.10454) +
        169.344 -
        168) /
      1000;
    delayTimes[LFO_DELAY_RAMP] =
      (lfoRate * 0.321877 * Math.pow(params.lfoDelay, 2.01163) +
        494.201 -
        168) /
      1000;
    delayIncrements[LFO_DELAY_RAMP] =
      1 / (delayTimes[LFO_DELAY_RAMP] - delayTimes[LFO_DELAY_ONSET]);
  }
}
