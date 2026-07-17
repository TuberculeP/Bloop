import type {
  BasicSynthConfig,
  InstrumentConfig,
  NoteName,
  OscillatorType,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";
import { noteNameToFrequency } from "../noteUtils";

interface ActiveOscillator {
  oscillator: OscillatorNode;
  gainNode: GainNode;
}

export class BasicSynthEngine extends BaseEngine {
  readonly type = "basicSynth";
  readonly resourceKey = null;
  readonly resourceLabel = "Basic Synth";

  private activeOscillators: Map<string, ActiveOscillator> = new Map();
  private oscillatorType: OscillatorType;
  private gain: number;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: BasicSynthConfig,
  ) {
    super(audioContext, destination, config);
    this.oscillatorType = config.oscillatorType;
    this.gain = config.gain ?? 1;
    this._state = "ready";
  }

  async preload(): Promise<void> {
    // No-op: BasicSynth is always ready
  }

  playNote(noteName: NoteName, noteId: string, velocity: number = 100): void {
    if (this.activeOscillators.has(noteId)) {
      this.stopNote(noteId);
    }

    const frequency = noteNameToFrequency(noteName);

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = this.oscillatorType;
    oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime,
    );

    const gainNode = this.audioContext.createGain();
    const normalizedVelocity = (velocity / 127) * this.gain;
    gainNode.gain.setValueAtTime(
      normalizedVelocity,
      this.audioContext.currentTime,
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    oscillator.start();

    this.activeOscillators.set(noteId, { oscillator, gainNode });
  }

  stopNote(noteId: string): void {
    const active = this.activeOscillators.get(noteId);
    if (active) {
      try {
        active.gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          this.audioContext.currentTime + 0.02,
        );
        setTimeout(() => {
          try {
            active.oscillator.stop();
            active.oscillator.disconnect();
            active.gainNode.disconnect();
          } catch {
            // Ignore if already stopped
          }
        }, 30);
      } catch {
        // Ignore errors
      }
      this.activeOscillators.delete(noteId);
    }
  }

  stopAllNotes(): void {
    for (const noteId of this.activeOscillators.keys()) {
      this.stopNote(noteId);
    }
  }

  updateConfig(config: Partial<InstrumentConfig>): void {
    if (typeof config.oscillatorType === "string") {
      this.oscillatorType = config.oscillatorType as OscillatorType;
    }
    if (config.gain !== undefined) {
      this.gain = config.gain;
    }
    this.config = { ...this.config, ...config } as BasicSynthConfig;
  }

  dispose(): void {
    this.stopAllNotes();
    this.activeOscillators.clear();
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
