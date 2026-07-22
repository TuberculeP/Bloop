// Métadonnées des paramètres du pseudo-effet "channel" (fader volume/pan,
// hors de la pile d'effets réordonnable — voir le commentaire sur
// `AutomationTarget` dans lib/utils/types.ts). Même esprit que
// `EffectParamMeta` (lib/audio/effects/types.ts) pour les effets de la pile :
// un registre statique interrogé par id, jamais une comparaison de chaîne en
// dur dans les composants qui l'affichent (AutomationLane.vue notamment).
export interface ChannelParamMeta {
  id: string; // "volume" | "pan"
  label: string;
  shortLabel: string;
  unit: string;
  min: number;
  max: number;
  // Normalisé 0-1 : position canonique du premier point posé quand on active
  // l'automatisation de ce paramètre (indépendante de la valeur live du
  // fader au moment du clic).
  defaultStart: number;
  topLabel?: string; // repère haut de l'axe vertical de la courbe (ex: "D" pour le pan)
  bottomLabel?: string; // repère bas de l'axe vertical de la courbe (ex: "G" pour le pan)
}

const CHANNEL_PARAMS: ChannelParamMeta[] = [
  {
    id: "volume",
    label: "Volume",
    shortLabel: "Vol",
    unit: "%",
    min: 0,
    max: 100,
    defaultStart: 1,
  },
  {
    id: "pan",
    label: "Pan",
    shortLabel: "Pan",
    unit: "",
    min: -127,
    max: 127,
    defaultStart: 0.5,
    topLabel: "D",
    bottomLabel: "G",
  },
];

export function getChannelParamMeta(
  paramId: string,
): ChannelParamMeta | undefined {
  return CHANNEL_PARAMS.find((p) => p.id === paramId);
}
