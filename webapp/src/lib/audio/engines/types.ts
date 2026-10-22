import type {
  InstrumentConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../utils/types";

export type EngineState = "idle" | "loading" | "ready" | "error";

export type EngineStateCallback = (state: EngineState) => void;

export interface InstrumentEngine {
  readonly type: string;
  readonly config: InstrumentConfig;

  readonly state: EngineState;

  /**
   * Clé unique identifiant la ressource à précharger.
   * Les engines avec la même clé partagent la même ressource (un seul chargement).
   * null = pas de préchargement nécessaire.
   */
  readonly resourceKey: string | null;

  /**
   * Label lisible pour l'affichage pendant le chargement.
   */
  readonly resourceLabel: string;

  onStateChange(callback: EngineStateCallback): () => void;

  preload(): Promise<void>;

  /**
   * `when` is an AudioContext time. Omitted = now (live playing). The
   * playback scheduler passes a time slightly in the future so notes land
   * exactly on the grid regardless of main-thread jitter.
   */
  playNote(
    noteName: NoteName,
    noteId: string,
    velocity?: number,
    when?: number,
  ): void;
  /** Stopping before the scheduled start cancels the note. */
  stopNote(noteId: string, when?: number): void;
  stopAllNotes(): void;

  updateConfig(config: InstrumentConfigUpdate): void;

  dispose(): void;
}

export interface InstrumentEngineConstructor {
  new (
    audioContext: AudioContext,
    destination: AudioNode,
    config: InstrumentConfig,
  ): InstrumentEngine;
}
