/// <reference path="./audioWorkletGlobals.d.ts" />
// Rendu FM (style DX7) échantillon par échantillon, sur le thread audio.
// Le DSP (dsp/*) est un renderer logiciel pur — pas de graphe Web Audio natif —
// d'où la nécessité d'un AudioWorkletProcessor.
import { dspConfig } from "./dsp/config";
import { buildRuntimeParams, FMVoice } from "./dsp/voiceDx7";
import type { FmSynthMessageToProcessor } from "./protocol";

const MAX_POLYPHONY = 8;
// Niveau nominal par voix, emprunté à Hexter (voir synth.js de dx7-synth-js).
const PER_VOICE_LEVEL = 0.125 / 6;

class FmSynthProcessor extends AudioWorkletProcessor {
  private voices = new Map<string, FMVoice>();
  private patchLoaded = false;

  constructor() {
    super();
    dspConfig.sampleRate = sampleRate;
    this.port.onmessage = (event: MessageEvent<FmSynthMessageToProcessor>) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(message: FmSynthMessageToProcessor): void {
    switch (message.type) {
      case "loadPatch":
        FMVoice.setParams(buildRuntimeParams(message.patch));
        this.patchLoaded = true;
        break;

      case "noteOn": {
        if (!this.patchLoaded) break;
        if (this.voices.size >= MAX_POLYPHONY) {
          const oldestNoteId = this.voices.keys().next().value;
          if (oldestNoteId !== undefined) this.voices.delete(oldestNoteId);
        }
        this.voices.set(
          message.noteId,
          new FMVoice(message.note, message.velocity),
        );
        break;
      }

      case "noteOff":
        this.voices.get(message.noteId)?.noteOff();
        break;

      case "panic":
        this.voices.clear();
        break;
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const [left, right] = outputs[0];

    for (let frame = 0; frame < left.length; frame++) {
      let outL = 0;
      let outR = 0;
      for (const [noteId, voice] of this.voices) {
        if (voice.isFinished()) {
          this.voices.delete(noteId);
          continue;
        }
        const [l, r] = voice.render();
        outL += l;
        outR += r;
      }
      left[frame] = outL * PER_VOICE_LEVEL;
      right[frame] = outR * PER_VOICE_LEVEL;
    }

    return true;
  }
}

registerProcessor("fm-synth-processor", FmSynthProcessor);
