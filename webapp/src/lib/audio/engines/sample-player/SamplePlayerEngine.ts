import { GrainPlayer, getContext, setContext } from "tone";
import type {
  SamplePlayerConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";
import { noteNameToMidi } from "../noteUtils";

const GRAIN_SIZE = 0.1;
const GRAIN_OVERLAP = 0.05;

type ActiveVoice =
  | { kind: "normal"; source: AudioBufferSourceNode; envelopeNode: GainNode }
  | { kind: "stretch"; player: GrainPlayer; envelopeNode: GainNode };

export class SamplePlayerEngine extends BaseEngine {
  readonly type = "samplePlayer";
  readonly resourceKey = null;
  readonly resourceLabel = "Sample Player";

  private buffer: AudioBuffer | null = null;
  private sampleId: string | null;
  private rootNoteMidi: number;
  private mode: "normal" | "stretch";
  private gain: number;
  private attack: number;
  private decay: number;
  private sustain: number;
  private release: number;
  private activeVoices: Map<string, ActiveVoice> = new Map();

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: SamplePlayerConfig,
  ) {
    super(audioContext, destination, config);

    if (getContext().rawContext !== audioContext) {
      setContext(audioContext);
    }

    this.sampleId = config.sampleId;
    this.rootNoteMidi = noteNameToMidi(config.rootNote);
    this.mode = config.mode;
    this.gain = config.gain ?? 1;
    this.attack = config.attack ?? 0;
    this.decay = config.decay ?? 0;
    this.sustain = config.sustain ?? 1;
    this.release = config.release ?? 0.05;

    this._state = this.sampleId ? "loading" : "ready";
  }

  async preload(): Promise<void> {
    // No-op : le buffer est fourni par trackAudioStore via setBuffer(),
    // qui résout le sampleId via audioLibraryStore (frontière lib/audio <-> stores).
  }

  /** Appelé par trackAudioStore une fois le sample résolu (ou remis à null). */
  setBuffer(buffer: AudioBuffer | null): void {
    this.buffer = buffer;
    this.setState(buffer || !this.sampleId ? "ready" : "error");
  }

  setLoading(): void {
    this.setState("loading");
  }

  playNote(noteName: NoteName, noteId: string, velocity: number = 100): void {
    if (!this.buffer) return;
    if (this.activeVoices.has(noteId)) {
      this.stopNote(noteId);
    }

    const now = this.audioContext.currentTime;
    const envelopeNode = this.audioContext.createGain();
    envelopeNode.connect(this.destination);

    const peakGain = (velocity / 127) * this.gain;
    envelopeNode.gain.setValueAtTime(0, now);
    if (this.attack > 0) {
      envelopeNode.gain.linearRampToValueAtTime(peakGain, now + this.attack);
    } else {
      envelopeNode.gain.setValueAtTime(peakGain, now);
    }
    if (this.decay > 0 && this.sustain < 1) {
      envelopeNode.gain.linearRampToValueAtTime(
        Math.max(peakGain * this.sustain, 0.0001),
        now + this.attack + this.decay,
      );
    }

    const semitoneOffset = noteNameToMidi(noteName) - this.rootNoteMidi;

    if (this.mode === "stretch") {
      const player = new GrainPlayer({
        url: this.buffer,
        grainSize: GRAIN_SIZE,
        overlap: GRAIN_OVERLAP,
        playbackRate: 1,
        detune: semitoneOffset * 100,
      });
      player.connect(envelopeNode);
      player.onstop = () => {
        const voice = this.activeVoices.get(noteId);
        if (voice?.kind === "stretch" && voice.player === player) {
          this.activeVoices.delete(noteId);
          envelopeNode.disconnect();
        }
      };
      player.start(now);
      this.activeVoices.set(noteId, { kind: "stretch", player, envelopeNode });
    } else {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.buffer;
      source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
      source.connect(envelopeNode);
      source.onended = () => {
        const voice = this.activeVoices.get(noteId);
        if (voice?.kind === "normal" && voice.source === source) {
          this.activeVoices.delete(noteId);
          envelopeNode.disconnect();
        }
      };
      source.start(now);
      this.activeVoices.set(noteId, { kind: "normal", source, envelopeNode });
    }
  }

  stopNote(noteId: string): void {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;

    const now = this.audioContext.currentTime;
    const releaseTime = Math.max(this.release, 0.005);
    try {
      voice.envelopeNode.gain.cancelScheduledValues(now);
      voice.envelopeNode.gain.setValueAtTime(
        voice.envelopeNode.gain.value,
        now,
      );
      voice.envelopeNode.gain.exponentialRampToValueAtTime(
        0.0001,
        now + releaseTime,
      );
    } catch {
      // Ignore errors
    }

    setTimeout(
      () => {
        try {
          if (voice.kind === "normal") {
            voice.source.stop();
            voice.source.disconnect();
          } else {
            voice.player.stop();
            voice.player.dispose();
          }
          voice.envelopeNode.disconnect();
        } catch {
          // Ignore errors
        }
      },
      releaseTime * 1000 + 50,
    );

    this.activeVoices.delete(noteId);
  }

  stopAllNotes(): void {
    for (const noteId of this.activeVoices.keys()) {
      this.stopNote(noteId);
    }
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.sampleId !== undefined) this.sampleId = config.sampleId;
    if (config.rootNote !== undefined) {
      this.rootNoteMidi = noteNameToMidi(config.rootNote);
    }
    if (config.mode !== undefined) this.mode = config.mode;
    if (config.gain !== undefined) this.gain = config.gain;
    if (config.attack !== undefined) this.attack = config.attack;
    if (config.decay !== undefined) this.decay = config.decay;
    if (config.sustain !== undefined) this.sustain = config.sustain;
    if (config.release !== undefined) this.release = config.release;

    this.config = { ...this.config, ...config } as SamplePlayerConfig;
  }

  dispose(): void {
    this.stopAllNotes();
    this.activeVoices.clear();
    this.buffer = null;
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
