import type {
  SamplePlayerConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";
import { noteNameToMidi } from "../noteUtils";
import { envelopeLevelAt, holdParamAt } from "../scheduling";
import {
  createStretchVoice,
  ensureStretchEngineReady,
  isStretchEngineReady,
  type StretchVoice,
} from "../stretchEngine";

type ActiveVoice = (
  | { kind: "normal"; source: AudioBufferSourceNode }
  | { kind: "stretch"; voice: StretchVoice }
) & {
  envelopeNode: GainNode;
  startTime: number;
  peakGain: number;
  // Scheduled stop time (Infinity while held). The entry stays until the
  // source has ended, so a stop can still be moved earlier.
  stopAt: number;
};

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

    // Fire-and-forget : en pratique déjà déclenché globalement par
    // audioBusStore dès la création du contexte partagé, bien avant qu'une
    // note ne puisse être jouée (chargement des samples sur le CDN prend
    // largement plus de temps qu'un addModule local).
    ensureStretchEngineReady(audioContext);

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

  playNote(
    noteName: NoteName,
    noteId: string,
    velocity: number = 100,
    when?: number,
  ): void {
    if (!this.buffer) return;
    const now = this.resolveTime(when);
    this.stopNote(noteId, now);

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

    // playNote est synchrone (déclenchement temps réel) : si le worklet
    // SoundTouch n'est pas encore prêt (cas rare, seulement possible dans
    // les premières dizaines de ms après le boot de l'app), on dégrade
    // gracieusement vers le pitch "classique" (playbackRate natif) pour
    // cette note-là — auto-corrigé dès la note suivante.
    if (this.mode === "stretch" && isStretchEngineReady(this.audioContext)) {
      const voice = createStretchVoice({
        context: this.audioContext,
        buffer: this.buffer,
        detuneCents: semitoneOffset * 100,
      });
      voice.connect(envelopeNode);
      voice.onended = () => {
        const active = this.activeVoices.get(noteId);
        if (active?.kind === "stretch" && active.voice === voice) {
          this.activeVoices.delete(noteId);
        }
        envelopeNode.disconnect();
      };
      voice.start(now, 0, this.buffer.duration);
      this.activeVoices.set(noteId, {
        kind: "stretch",
        voice,
        envelopeNode,
        startTime: now,
        peakGain,
        stopAt: Infinity,
      });
    } else {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.buffer;
      source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
      source.connect(envelopeNode);
      source.onended = () => {
        const voice = this.activeVoices.get(noteId);
        if (voice?.kind === "normal" && voice.source === source) {
          this.activeVoices.delete(noteId);
        }
        source.disconnect();
        envelopeNode.disconnect();
      };
      source.start(now);
      this.activeVoices.set(noteId, {
        kind: "normal",
        source,
        envelopeNode,
        startTime: now,
        peakGain,
        stopAt: Infinity,
      });
    }
  }

  // Release ramp then source stop, both scheduled on the audio clock;
  // disconnection happens in onended. Stopping before the scheduled start
  // means the voice never sounds.
  stopNote(noteId: string, when?: number): void {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;
    const stopTime = this.resolveTime(when);
    if (stopTime >= voice.stopAt) return;
    voice.stopAt = stopTime;

    const releaseTime = Math.max(this.release, 0.005);
    const gain = voice.envelopeNode.gain;
    const fallback =
      stopTime <= this.audioContext.currentTime
        ? gain.value
        : envelopeLevelAt(
            stopTime - voice.startTime,
            voice.peakGain,
            this.attack,
            this.decay,
            this.sustain,
          );
    try {
      holdParamAt(gain, stopTime, Math.max(fallback, 0.0001));
      gain.exponentialRampToValueAtTime(0.0001, stopTime + releaseTime);
      if (voice.kind === "normal") {
        voice.source.stop(stopTime + releaseTime + 0.01);
      } else {
        voice.voice.stop(stopTime + releaseTime + 0.01);
      }
    } catch {
      // Already stopped
    }
  }

  stopAllNotes(): void {
    for (const noteId of [...this.activeVoices.keys()]) {
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
