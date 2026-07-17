import type { InstrumentConfig, NoteName } from "../../utils/types";
import type { EnumInstrumentParamOption } from "../instruments/types";

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

  playNote(noteName: NoteName, noteId: string, velocity?: number): void;
  stopNote(noteId: string): void;
  stopAllNotes(): void;

  updateConfig(config: Partial<InstrumentConfig>): void;

  /** Résout les options d'un param enum "dynamic" contre l'état vivant de
   *  cette instance (ex: presets du soundfont chargé). Absent = pas de
   *  param dynamique pour cet engine. */
  getParamOptions?(paramId: string): EnumInstrumentParamOption[];

  dispose(): void;
}

export interface InstrumentEngineConstructor {
  new (
    audioContext: AudioContext,
    destination: AudioNode,
    config: InstrumentConfig,
  ): InstrumentEngine;
}
