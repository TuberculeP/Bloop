// Port de envelope-dx7.js (dx7-synth-js, MIT, Matt Montag)
// Basé sur http://wiki.music-synthesizer-for-android.googlecode.com/git/img/env.html
const ENV_OFF = 4;

const outputlevel = [
  0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46,
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
  67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85,
  86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103,
  104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
  119, 120, 121, 122, 123, 124, 125, 126, 127,
];

const outputLUT: number[] = [];
for (let i = 0; i < 4096; i++) {
  const dB = (i - 3824) * 0.0235;
  outputLUT[i] = Math.pow(20, dB / 20);
}

export class EnvelopeDX7 {
  private levels: number[];
  private rates: number[];
  private level = 0;
  private down = true;
  private state = 0;
  private targetlevel = 0;
  private rising = false;
  private qr = 0;
  private decayIncrement = 0;

  constructor(levels: number[], rates: number[]) {
    this.levels = levels;
    this.rates = rates;
    this.advance(0);
  }

  render(): number {
    if (this.state < 3 || (this.state < 4 && !this.down)) {
      let lev = this.level;
      if (this.rising) {
        lev += this.decayIncrement * (2 + (this.targetlevel - lev) / 256);
        if (lev >= this.targetlevel) {
          lev = this.targetlevel;
          this.advance(this.state + 1);
        }
      } else {
        lev -= this.decayIncrement;
        if (lev <= this.targetlevel) {
          lev = this.targetlevel;
          this.advance(this.state + 1);
        }
      }
      this.level = lev;
    }

    // Convertit le niveau DX7 -> dB -> amplitude
    return outputLUT[Math.floor(this.level)];
  }

  private advance(newstate: number): void {
    this.state = newstate;
    if (this.state < 4) {
      const newlevel = this.levels[this.state];
      this.targetlevel = Math.max(0, (outputlevel[newlevel] << 5) - 224);
      this.rising = this.targetlevel - this.level > 0;
      const rateScaling = 0;
      this.qr = Math.min(
        63,
        rateScaling + ((this.rates[this.state] * 41) >> 6),
      );
      this.decayIncrement = Math.pow(2, this.qr / 4) / 2048;
    }
  }

  noteOff(): void {
    this.down = false;
    this.advance(3);
  }

  isFinished(): boolean {
    return this.state === ENV_OFF;
  }
}
