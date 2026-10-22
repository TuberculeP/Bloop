import type {
  BasicSynthConfig,
  InstrumentConfigUpdate,
  NoteName,
  OscillatorType,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";
import { noteNameToFrequency } from "../noteUtils";

interface ActiveOscillator {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  level: number;
  // Scheduled stop time (Infinity while held). The entry stays until the
  // oscillator has ended, so a stop can still be moved earlier.
  stopAt: number;
}

const RELEASE_SECONDS = 0.02;

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

  playNote(
    noteName: NoteName,
    noteId: string,
    velocity: number = 100,
    when?: number,
  ): void {
    const startTime = this.resolveTime(when);
    this.stopNote(noteId, startTime);

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = this.oscillatorType;
    oscillator.frequency.setValueAtTime(
      noteNameToFrequency(noteName),
      startTime,
    );

    const gainNode = this.audioContext.createGain();
    const level = (velocity / 127) * this.gain;
    gainNode.gain.setValueAtTime(level, startTime);

    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    const entry = { oscillator, gainNode, level, stopAt: Infinity };
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      if (this.activeOscillators.get(noteId) === entry) {
        this.activeOscillators.delete(noteId);
      }
    };

    oscillator.start(startTime);

    this.activeOscillators.set(noteId, entry);
  }

  // Short fade then stop, both scheduled on the audio clock. Stopping before
  // the scheduled start means the oscillator never sounds.
  stopNote(noteId: string, when?: number): void {
    const active = this.activeOscillators.get(noteId);
    if (!active) return;
    const stopTime = this.resolveTime(when);
    if (stopTime >= active.stopAt) return;
    active.stopAt = stopTime;

    const gain = active.gainNode.gain;
    gain.cancelScheduledValues(stopTime);
    gain.setValueAtTime(active.level, stopTime);
    gain.exponentialRampToValueAtTime(0.001, stopTime + RELEASE_SECONDS);
    try {
      active.oscillator.stop(stopTime + RELEASE_SECONDS + 0.01);
    } catch {
      // Already stopped
    }
  }

  stopAllNotes(): void {
    for (const noteId of [...this.activeOscillators.keys()]) {
      this.stopNote(noteId);
    }
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.oscillatorType) {
      this.oscillatorType = config.oscillatorType;
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
