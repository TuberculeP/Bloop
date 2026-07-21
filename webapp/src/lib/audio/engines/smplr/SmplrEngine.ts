import type {
  SmplrConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { Soundfont, CacheStorage as SmplrCacheStorage } from "smplr";
import { BaseEngine } from "../BaseEngine";
import { VoicePool } from "../voicePool";

const VOICE_POOL_SIZE = 8;

export class SmplrEngine extends BaseEngine {
  readonly type = "smplr";

  private voicePool = new VoicePool<Soundfont>();
  private storage = new SmplrCacheStorage("bloop-smplr-soundfonts");
  private currentSoundfontName: string;
  private loadPromise: Promise<void> | null = null;

  private attack: number;
  private decay: number;
  private sustain: number;
  private release: number;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: SmplrConfig,
  ) {
    super(audioContext, destination, config);
    this.currentSoundfontName = config.soundfont;
    this.attack = config.attack ?? 0;
    this.decay = config.decay ?? 0;
    this.sustain = config.sustain ?? 1;
    this.release = config.release ?? 0.3;
  }

  get resourceKey(): string {
    return `smplr:${this.currentSoundfontName}`;
  }

  get resourceLabel(): string {
    return this.currentSoundfontName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async preload(): Promise<void> {
    if (this._state === "ready") return;
    if (this._state === "loading" && this.loadPromise) {
      await this.loadPromise;
      return;
    }
    await this.loadSoundfont(this.currentSoundfontName);
  }

  private async loadSoundfont(instrumentName: string): Promise<void> {
    this.setState("loading");
    this.loadPromise = (async () => {
      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        await this.voicePool.load(
          VOICE_POOL_SIZE,
          this.audioContext,
          this.destination,
          async (envelopeGain) => {
            const sf = new Soundfont(this.audioContext, {
              instrument: instrumentName,
              storage: this.storage,
              destination: envelopeGain,
            });
            await sf.load;
            return sf;
          },
        );

        this.currentSoundfontName = instrumentName;
        this.setState("ready");
      } catch (error) {
        console.error("[SmplrEngine] Failed to load soundfont:", error);
        this.setState("error");
      }
    })();
    await this.loadPromise;
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
    try {
      this.voicePool.play(
        noteId,
        this.audioContext,
        this.attack,
        this.decay,
        this.sustain,
        (sampler) => sampler.start({ note: noteName, decayTime: this.release }),
      );
    } catch (error) {
      console.error("[SmplrEngine] Failed to play note:", error);
    }
  }

  stopNote(noteId: string): void {
    this.voicePool.stop(noteId, this.audioContext, this.release);
  }

  stopAllNotes(): void {
    this.voicePool.stopAll(this.audioContext, this.release);
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.attack !== undefined) this.attack = config.attack;
    if (config.decay !== undefined) this.decay = config.decay;
    if (config.sustain !== undefined) this.sustain = config.sustain;
    if (config.release !== undefined) this.release = config.release;

    if (config.soundfont && config.soundfont !== this.currentSoundfontName) {
      this.loadSoundfont(config.soundfont);
    }
    this.config = { ...this.config, ...config } as SmplrConfig;
  }

  dispose(): void {
    this.voicePool.dispose();
    this.loadPromise = null;
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
