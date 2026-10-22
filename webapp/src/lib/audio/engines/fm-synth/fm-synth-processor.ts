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

type TimedMessage = Extract<
  FmSynthMessageToProcessor,
  { type: "noteOn" | "noteOff" }
>;
type ScheduledEvent = { frame: number; message: TimedMessage };

class FmSynthProcessor extends AudioWorkletProcessor {
  private voices = new Map<string, FMVoice>();
  private patchLoaded = false;
  // Note events sorted by frame, applied on their exact frame in process().
  private queue: ScheduledEvent[] = [];

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

      case "noteOn":
        this.enqueue(message);
        break;

      case "noteOff": {
        // A note-off cancels later pending events of the same note: a
        // note-on not started yet, or a note-off it supersedes.
        const frame = Math.round(message.time * sampleRate);
        this.queue = this.queue.filter(
          (event) =>
            event.message.noteId !== message.noteId || event.frame < frame,
        );
        this.enqueue(message);
        break;
      }

      case "panic":
        this.queue = [];
        this.voices.clear();
        break;
    }
  }

  private enqueue(message: TimedMessage): void {
    const event = { frame: Math.round(message.time * sampleRate), message };
    let index = this.queue.length;
    while (index > 0 && this.queue[index - 1].frame > event.frame) index--;
    this.queue.splice(index, 0, event);
  }

  private applyEvent(message: TimedMessage): void {
    switch (message.type) {
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
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const [left, right] = outputs[0];

    for (let frame = 0; frame < left.length; frame++) {
      const absoluteFrame = currentFrame + frame;
      while (this.queue.length > 0 && this.queue[0].frame <= absoluteFrame) {
        this.applyEvent(this.queue.shift()!.message);
      }

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
