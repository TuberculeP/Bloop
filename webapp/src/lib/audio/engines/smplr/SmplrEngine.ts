import type {
  SmplrConfig,
  InstrumentConfig,
  NoteName,
} from "../../../utils/types";
import { Soundfont } from "smplr";
import { BaseEngine } from "../BaseEngine";

export class SmplrEngine extends BaseEngine {
  readonly type = "smplr";

  private soundfont: Soundfont | null = null;
  private activeNotes: Map<string, () => void> = new Map();
  private currentSoundfontName: string;
  private loadPromise: Promise<void> | null = null;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: SmplrConfig,
  ) {
    super(audioContext, destination, config);
    this.currentSoundfontName = config.soundfont;
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

        const sf = new Soundfont(this.audioContext, {
          instrument: instrumentName,
          destination: this.destination,
        });

        await sf.load;

        this.soundfont = sf;
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
    if (!this.soundfont) return;

    if (this.activeNotes.has(noteId)) {
      this.stopNote(noteId);
    }

    try {
      const stopFn = this.soundfont.start({ note: noteName });
      this.activeNotes.set(noteId, stopFn);
    } catch (error) {
      console.error("[SmplrEngine] Failed to play note:", error);
    }
  }

  stopNote(noteId: string): void {
    const stopFn = this.activeNotes.get(noteId);
    if (stopFn) {
      try {
        stopFn();
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

  updateConfig(config: Partial<InstrumentConfig>): void {
    if (
      typeof config.soundfont === "string" &&
      config.soundfont !== this.currentSoundfontName
    ) {
      this.stopAllNotes();
      this.soundfont = null;
      this.loadPromise = null;
      this.loadSoundfont(config.soundfont);
    }
    this.config = { ...this.config, ...config } as SmplrConfig;
  }

  dispose(): void {
    this.stopAllNotes();
    this.activeNotes.clear();
    this.soundfont = null;
    this.loadPromise = null;
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
