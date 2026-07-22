import type {
  SmplrConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import {
  Soundfont,
  CacheStorage as SmplrCacheStorage,
  type Storage,
  type StorageResponse,
} from "smplr";
import { BaseEngine } from "../BaseEngine";
import { VoicePool } from "../voicePool";

const VOICE_POOL_SIZE = 8;

// Coalesce les fetch vers la même URL : `Soundfont` ne cache le résultat
// qu'après coup (cache.put), donc les 8 voix du VoicePool — voire plusieurs
// tracks partageant le même instrument — retéléchargeraient chacune le
// fichier. `resolved` mémoïse le résultat définitivement (pas seulement le
// temps du fetch en vol) : le VoicePool charge maintenant ses voix
// séquentiellement (cf. voicePool.ts), donc la voix 2 arrive après que la
// voix 1 a déjà fini — sans ce cache permanent, chacune referait son propre
// aller-retour Cache Storage au lieu de réutiliser le buffer déjà en mémoire.
// Un seul `Storage` partagé par toutes les instances de SmplrEngine (pas un
// par piste) pour dédupliquer aussi entre tracks.
class DedupingSmplrStorage implements Storage {
  private cache = new SmplrCacheStorage("bloop-smplr-soundfonts");
  private inflight = new Map<string, Promise<ArrayBuffer>>();
  private resolved = new Map<string, ArrayBuffer>();

  async fetch(url: string): Promise<StorageResponse> {
    let buffer = this.resolved.get(url);
    if (!buffer) {
      let promise = this.inflight.get(url);
      if (!promise) {
        promise = this.cache.fetch(url).then((res) => res.arrayBuffer());
        promise.finally(() => this.inflight.delete(url));
        this.inflight.set(url, promise);
      }
      buffer = await promise;
      this.resolved.set(url, buffer);
    }

    const bufferCopy = buffer.slice(0);
    return {
      status: 200,
      arrayBuffer: async () => bufferCopy,
      json: async () => JSON.parse(new TextDecoder().decode(bufferCopy)),
      text: async () => new TextDecoder().decode(bufferCopy),
    };
  }
}

const sharedStorage: Storage = new DedupingSmplrStorage();

export class SmplrEngine extends BaseEngine {
  readonly type = "smplr";

  private voicePool = new VoicePool<Soundfont>();
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
              storage: sharedStorage,
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
