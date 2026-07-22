import type { TimeSignature } from "../../utils/types";

// Interface d'effet volontairement proche, dans la FORME (pas le protocole),
// de WAM 2.0 (Web Audio Modules) : `input`/`output` ~ getter `audioNode` d'un
// WamNode, `getParams()` ~ WamParameterInfo[]. Ça prépare un futur adaptateur
// (wrapper autour d'un vrai WamNode tiers) sans réécriture, sans payer le coût
// de conformité au protocole complet maintenant. Le sandboxing GUI (iframe)
// n'est pas implémenté ici : à prévoir seulement le jour où un plugin tiers
// non fiable est réellement chargé.

// Métadonnées statiques d'un paramètre : ni AudioContext ni node audio, pour
// que l'UI (rack d'effets) puisse afficher labels/bornes sans dépendre d'une
// instance audio déjà construite (EffectDefinition.params).
export interface EffectParamMeta {
  id: string; // unique dans le type d'effet, ex: "sub_gain", "amount", "threshold"
  label: string;
  shortLabel?: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  toDisplay?: (value: number) => string;
  /** Paramètre discret (ex: rate, forme de courbe) : rendu en `<select>` par
   * le rack d'effets plutôt qu'en slider continu. `value` reste le nombre
   * stocké dans `EffectInstanceConfig.params`. */
  options?: { value: number; label: string }[];
}

// Version "vivante" d'un paramètre, résolue contre une instance audio réelle
// (EffectInstance.getParams()) — utilisée par l'automation et par l'écriture
// directe de valeur, jamais par l'UI de rendu.
export interface EffectParamDescriptor extends EffectParamMeta {
  /** Cas simple : AudioParam natif piloté directement (setTargetAtTime). */
  audioParam?: AudioParam;
  /** Cas non-AudioParam (ex: un seul "amount" pilotant dryGain+wetGain couplés). */
  setValue?: (value: number, audioCtx: AudioContext) => void;
  /** Lecture de la valeur réelle courante (init UI, affichage badge). */
  getValue: () => number;
}

export interface EffectInstance {
  readonly id: string; // instance id, stable — distinct du `type`
  readonly type: string;
  readonly input: AudioNode;
  readonly output: AudioNode;
  getParams(): EffectParamDescriptor[];
  getParam(paramId: string): EffectParamDescriptor | undefined;
  dispose(): void;
  /** Optionnel : effets synchronisés au tempo (ex: Bloopy Pump). Appelé par la
   * boucle de lecture à chaque franchissement de croche (voir
   * EffectChain.notifyBeatBoundary / useTimelinePlaybackEngine). */
  onBeatBoundary?(
    tick: number,
    timeSignature: TimeSignature,
    tempo: number,
  ): void;
}
