// Même esprit que effects/types.ts (proche de WAM 2.0 dans la FORME, pas le
// protocole). Contrairement aux effets (paramètres strictement numériques),
// les instruments ont des réglages à choix fermé (waveform, soundfont,
// preset) — d'où un discriminant `kind` sur les métadonnées.

export interface NumericInstrumentParamMeta {
  kind: "number";
  id: string; // ex: "attack", "gain"
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  toDisplay?: (value: number) => string;
}

export interface EnumInstrumentParamOption {
  value: string;
  label: string;
}

export interface EnumInstrumentParamMeta {
  kind: "enum";
  id: string; // ex: "oscillatorType", "soundfont", "instrument"
  label: string;
  defaultValue: string;
  /**
   * Liste statique connue à froid (waveform, soundfont) OU "dynamic" quand la
   * liste ne peut être connue qu'après chargement d'une ressource par une
   * instance d'engine (ex: presets d'un .sf2 chargé) — dans ce cas l'UI doit
   * appeler InstrumentEngine.getParamOptions(paramId) sur l'instance vivante.
   */
  options: EnumInstrumentParamOption[] | "dynamic";
}

export type InstrumentParamMeta =
  NumericInstrumentParamMeta | EnumInstrumentParamMeta;
