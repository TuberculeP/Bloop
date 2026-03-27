import type {
  EarthboundConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { Soundfont2Sampler } from "smplr";
import { SoundFont2 } from "soundfont2";
import { BaseEngine } from "../BaseEngine";

const EARTHBOUND_SF2_URL = "/soundfonts/earthbound.sf2";

interface ActiveNote {
  stopFn: () => void;
  envelopeNode: GainNode;
}

export class EarthboundEngine extends BaseEngine {
  readonly type = "earthbound";
  readonly resourceKey = "earthbound:sf2";
  readonly resourceLabel = "EarthBound Soundfont";

  private sampler: Soundfont2Sampler | null = null;
  private activeNotes: Map<string, ActiveNote> = new Map();
  private currentInstrument: string = "";
  private loadPromise: Promise<void> | null = null;
  private _instrumentNames: string[] = [];
  private outputNode: GainNode;

  private attack: number = 0;
  private decay: number = 0;
  private sustain: number = 1;
  private release: number = 0.3;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: EarthboundConfig,
  ) {
    super(audioContext, destination, config);
    this.currentInstrument = config.instrument || "";

    this.attack = config.attack ?? 0;
    this.decay = config.decay ?? 0;
    this.sustain = config.sustain ?? 1;
    this.release = config.release ?? 0.3;

    this.outputNode = audioContext.createGain();
    this.outputNode.connect(destination);
  }

  get instrumentNames(): string[] {
    return this._instrumentNames;
  }

  async preload(): Promise<void> {
    if (this._state === "ready") return;
    if (this._state === "loading" && this.loadPromise) {
      await this.loadPromise;
      return;
    }
    await this.loadSoundfont();
  }

  private async loadSoundfont(): Promise<void> {
    this.setState("loading");
    this.loadPromise = (async () => {
      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        const sampler = new Soundfont2Sampler(this.audioContext, {
          url: EARTHBOUND_SF2_URL,
          createSoundfont: (data) => new SoundFont2(new Uint8Array(data)),
          destination: this.outputNode,
        });

        await sampler.load;

        this._instrumentNames = sampler.instrumentNames;
        this.sampler = sampler;

        if (this._instrumentNames.length > 0) {
          const instrumentToLoad =
            this.currentInstrument || this._instrumentNames[0];
          await sampler.loadInstrument(instrumentToLoad);
          this.currentInstrument = instrumentToLoad;

          const config = this.config as EarthboundConfig;
          config.instrument = this.currentInstrument;
        }

        this.setState("ready");
      } catch (error) {
        console.error("[EarthboundEngine] Failed to load soundfont:", error);
        this.setState("error");
      }
    })();
    await this.loadPromise;
  }

  async loadInstrument(instrumentName: string): Promise<void> {
    if (!this.sampler || this._state !== "ready") return;
    if (instrumentName === this.currentInstrument) return;

    try {
      this.stopAllNotes();
      await this.sampler.loadInstrument(instrumentName);
      this.currentInstrument = instrumentName;

      const config = this.config as EarthboundConfig;
      config.instrument = instrumentName;
    } catch (error) {
      console.error("[EarthboundEngine] Failed to load instrument:", error);
    }
  }

  playNote(noteName: NoteName, noteId: string, _velocity: number = 100): void {
    if (this._state !== "ready") {
      this.preload().then(() => {
        if (this._state === "ready") {
          this.playNoteInternal(noteName, noteId);
        }
      });
      return;
    }

    this.playNoteInternal(noteName, noteId);
  }

  private playNoteInternal(noteName: NoteName, noteId: string): void {
    if (!this.sampler) return;

    if (this.activeNotes.has(noteId)) {
      this.stopNote(noteId);
    }

    try {
      const now = this.audioContext.currentTime;
      const envelopeNode = this.audioContext.createGain();
      envelopeNode.connect(this.outputNode);

      envelopeNode.gain.setValueAtTime(0, now);

      if (this.attack > 0) {
        envelopeNode.gain.linearRampToValueAtTime(1, now + this.attack);
      } else {
        envelopeNode.gain.setValueAtTime(1, now);
      }

      if (this.decay > 0 && this.sustain < 1) {
        const decayStart = now + this.attack;
        envelopeNode.gain.linearRampToValueAtTime(
          this.sustain,
          decayStart + this.decay,
        );
      }

      const stopFn = this.sampler.start({
        note: noteName,
        decayTime: this.release,
      });

      this.activeNotes.set(noteId, { stopFn, envelopeNode });
    } catch (error) {
      console.error("[EarthboundEngine] Failed to play note:", error);
    }
  }

  stopNote(noteId: string): void {
    const activeNote = this.activeNotes.get(noteId);
    if (activeNote) {
      try {
        activeNote.stopFn();
        setTimeout(
          () => {
            activeNote.envelopeNode.disconnect();
          },
          this.release * 1000 + 100,
        );
      } catch {
        // Ignore errors
      }
      this.activeNotes.delete(noteId);
    }
  }

  stopAllNotes(): void {
    for (const noteId of this.activeNotes.keys()) {
      this.stopNote(noteId);
    }
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.instrument && config.instrument !== this.currentInstrument) {
      this.loadInstrument(config.instrument);
    }
    if (config.attack !== undefined) this.attack = config.attack;
    if (config.decay !== undefined) this.decay = config.decay;
    if (config.sustain !== undefined) this.sustain = config.sustain;
    if (config.release !== undefined) this.release = config.release;

    this.config = { ...this.config, ...config } as EarthboundConfig;
  }

  dispose(): void {
    this.stopAllNotes();
    this.activeNotes.clear();
    this.outputNode.disconnect();
    this.sampler = null;
    this.loadPromise = null;
    this._instrumentNames = [];
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
