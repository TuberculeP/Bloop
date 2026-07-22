import type {
  UndertaleConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { Soundfont2Sampler } from "smplr";
import { SoundFont2 } from "soundfont2";
import { useSampleCacheStore } from "../../../../stores/sampleCacheStore";
import { BaseEngine } from "../BaseEngine";
import { VoicePool } from "../voicePool";

export const UNDERTALE_SF2_URL = "/soundfonts/undertale.sf2";
const UNDERTALE_SF2_CACHE_KEY = "undertale:sf2";
const VOICE_POOL_SIZE = 8;

// Le fichier (154 Mo) est unique et partagé par toutes les pistes/voix
// Undertale de l'onglet — mémoïsé au niveau module pour ne le fetch/parser
// qu'une seule fois, quel que soit le nombre de tracks ou la taille du
// VoicePool. `Soundfont2Sampler` (smplr) ne propose pas de point d'injection
// pour un buffer déjà chargé : son constructeur refait toujours en interne
// `fetch(options.url)` (node_modules/smplr/dist/index.mjs:2186-2191). On
// intercepte donc ce fetch précis pour qu'il résolve instantanément — le
// `createSoundfont` fourni plus bas ignore les octets reçus (il retourne
// directement le soundfont déjà parsé), donc une réponse vide suffit, pas
// besoin de garder le vrai buffer de 154 Mo en mémoire pour ce patch.
let sharedSoundfontPromise: Promise<SoundFont2> | null = null;

function installUndertaleFetchCache(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url === UNDERTALE_SF2_URL) {
      return Promise.resolve(new Response(new ArrayBuffer(0)));
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;
}

function getSharedUndertaleSoundfont(): Promise<SoundFont2> {
  if (!sharedSoundfontPromise) {
    sharedSoundfontPromise = (async () => {
      const cacheStore = useSampleCacheStore();
      await cacheStore.initialize();
      let buffer = await cacheStore.get(UNDERTALE_SF2_CACHE_KEY);
      if (!buffer) {
        const response = await fetch(UNDERTALE_SF2_URL);
        buffer = await response.arrayBuffer();
        await cacheStore.set(UNDERTALE_SF2_CACHE_KEY, buffer);
      }
      const soundfont = new SoundFont2(new Uint8Array(buffer));
      installUndertaleFetchCache();
      return soundfont;
    })();
  }
  return sharedSoundfontPromise;
}

export class UndertaleEngine extends BaseEngine {
  readonly type = "undertale";
  readonly resourceKey = UNDERTALE_SF2_CACHE_KEY;
  readonly resourceLabel = "Undertale Soundfont";

  private voicePool = new VoicePool<Soundfont2Sampler>();
  private currentInstrument: string = "";
  private loadPromise: Promise<void> | null = null;
  private _instrumentNames: string[] = [];

  private attack: number = 0;
  private decay: number = 0;
  private sustain: number = 1;
  private release: number = 0.3;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: UndertaleConfig,
  ) {
    super(audioContext, destination, config);
    this.currentInstrument = config.instrument || "";

    this.attack = config.attack ?? 0;
    this.decay = config.decay ?? 0;
    this.sustain = config.sustain ?? 1;
    this.release = config.release ?? 0.3;
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

        const sharedSoundfont = await getSharedUndertaleSoundfont();

        await this.voicePool.load(
          VOICE_POOL_SIZE,
          this.audioContext,
          this.destination,
          async (envelopeGain) => {
            const sampler = new Soundfont2Sampler(this.audioContext, {
              url: UNDERTALE_SF2_URL,
              createSoundfont: () => sharedSoundfont,
              destination: envelopeGain,
            });
            await sampler.load;
            return sampler;
          },
        );

        this._instrumentNames = this.voicePool.first?.instrumentNames ?? [];

        if (this._instrumentNames.length > 0) {
          const instrumentToLoad =
            this.currentInstrument || this._instrumentNames[0];
          await this.voicePool.forEachSampler((sampler) => {
            sampler.loadInstrument(instrumentToLoad);
          });
          this.currentInstrument = instrumentToLoad;

          const config = this.config as UndertaleConfig;
          config.instrument = this.currentInstrument;
        }

        this.setState("ready");
      } catch (error) {
        console.error("[UndertaleEngine] Failed to load soundfont:", error);
        this.setState("error");
      }
    })();
    await this.loadPromise;
  }

  async loadInstrument(instrumentName: string): Promise<void> {
    if (this._state !== "ready") return;
    if (instrumentName === this.currentInstrument) return;

    try {
      this.stopAllNotes();
      await this.voicePool.forEachSampler((sampler) => {
        sampler.loadInstrument(instrumentName);
      });
      this.currentInstrument = instrumentName;

      const config = this.config as UndertaleConfig;
      config.instrument = instrumentName;
    } catch (error) {
      console.error("[UndertaleEngine] Failed to load instrument:", error);
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
      console.error("[UndertaleEngine] Failed to play note:", error);
    }
  }

  stopNote(noteId: string): void {
    this.voicePool.stop(noteId, this.audioContext, this.release);
  }

  stopAllNotes(): void {
    this.voicePool.stopAll(this.audioContext, this.release);
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.instrument && config.instrument !== this.currentInstrument) {
      this.loadInstrument(config.instrument);
    }
    if (config.attack !== undefined) this.attack = config.attack;
    if (config.decay !== undefined) this.decay = config.decay;
    if (config.sustain !== undefined) this.sustain = config.sustain;
    if (config.release !== undefined) this.release = config.release;

    this.config = { ...this.config, ...config } as UndertaleConfig;
  }

  dispose(): void {
    this.voicePool.dispose();
    this.loadPromise = null;
    this._instrumentNames = [];
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
