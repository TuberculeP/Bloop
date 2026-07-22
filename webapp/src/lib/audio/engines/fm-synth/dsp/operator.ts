// Port de operator.js (dx7-synth-js, MIT, Matt Montag)
import { dspConfig } from "./config";
import type { EnvelopeDX7 } from "./envelopeDx7";
import type { LfoDX7 } from "./lfoDx7";
import type { RuntimeOperatorParams } from "./runtimeTypes";

// http://www.chipple.net/dx7/fig09-4.gif
const OCTAVE_1024 = 1.0006771307; // Math.exp(Math.log(2)/1024)
const PERIOD = Math.PI * 2;

export class Operator {
  phase = 0;
  val = 0;
  // Niveau de sortie effectif de cette voix précise : initialisé depuis le
  // patch puis réajusté selon la vélocité par FMVoice (voir son constructeur).
  outputLevel: number;
  private phaseStep = 0;

  constructor(
    private params: RuntimeOperatorParams,
    baseFrequency: number,
    private envelope: EnvelopeDX7,
    private lfo: LfoDX7,
  ) {
    this.outputLevel = params.outputLevel;
    this.updateFrequency(baseFrequency);
  }

  updateFrequency(baseFrequency: number): void {
    const frequency = this.params.oscMode
      ? (this.params.freqFixed as number)
      : baseFrequency *
        (this.params.freqRatio as number) *
        Math.pow(OCTAVE_1024, this.params.detune);
    this.phaseStep = (PERIOD * frequency) / dspConfig.sampleRate;
  }

  render(mod: number): number {
    this.val =
      Math.sin(this.phase + mod) *
      this.envelope.render() *
      this.lfo.renderAmp();
    this.phase += this.phaseStep * this.lfo.render();
    if (this.phase >= PERIOD) {
      this.phase -= PERIOD;
    }
    return this.val;
  }

  noteOff(): void {
    this.envelope.noteOff();
  }

  isFinished(): boolean {
    return this.envelope.isFinished();
  }
}
