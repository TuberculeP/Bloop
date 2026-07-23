import type { AudioClip, ClipResizeMode } from "../utils/types";
import { ticksPerSecond } from "./timeGrid";

export type StretchFields = Pick<
  AudioClip,
  | "stretched"
  | "stretchReferenceTicks"
  | "stretchReferenceTempo"
  | "semitones"
  | "cents"
>;

// Champs qui définissent l'altération d'un clip (stretch + tune) — liste
// unique à tenir à jour si un futur champ d'édition s'ajoute : copier/coller,
// dupliquer et couper un clip doivent tous préserver l'altération de la même
// façon plutôt que de réénumérer ces clés à chaque call site. Paramètre typé
// en `StretchFields` (pas `AudioClip`) pour accepter aussi bien un clip
// complet qu'une entrée de presse-papier (ClipboardClip) qui partage ces
// mêmes 5 champs sans être un AudioClip complet.
export function pickStretchFields(clip: StretchFields): StretchFields {
  return {
    stretched: clip.stretched,
    stretchReferenceTicks: clip.stretchReferenceTicks,
    stretchReferenceTempo: clip.stretchReferenceTempo,
    semitones: clip.semitones,
    cents: clip.cents,
  };
}

export interface ClipPlaybackParams {
  offsetSeconds: number;
  durationSeconds: number;
  playbackRate: number; // 1 si non stretché
  detuneCents: number; // 0 si non tuné
  needsStretchEngine: boolean; // true si stretched OU semitones/cents non nul
}

// Calcule les paramètres de lecture d'un clip à un instant donné (tempo
// courant), en tenant compte d'un éventuel stretch BPM-synchronisé et/ou
// tune. Recalculé à chaque déclenchement de lecture (jamais stocké) : un
// changement de tempo change directement le ratio au prochain trigger, ce
// qui recale rythmiquement un clip stretché sans action de l'utilisateur.
//
// Pour un clip stretché, offset/durée sont l'emplacement NATIF à lire dans
// le buffer source — calculés à la tempo de RÉFÉRENCE (stretchReferenceTempo,
// celle du dernier resize en mode stretch), jamais à la tempo courante :
// currentTempo ne sert qu'à calculer la durée CIBLE (temps réel voulu), via
// playbackRate. Utiliser la tempo courante pour l'offset natif ferait dériver
// la portion du buffer lue dès que le tempo change par rapport à la
// référence.
export function computeClipPlaybackParams(
  clip: AudioClip,
  currentTempo: number,
  playbackOffsetTicks: number = 0,
): ClipPlaybackParams {
  const detuneCents = (clip.semitones ?? 0) * 100 + (clip.cents ?? 0);
  const currentTickRate = ticksPerSecond(currentTempo);

  let offsetSeconds: number;
  let durationSeconds: number;
  let playbackRate = 1;

  if (
    clip.stretched &&
    clip.stretchReferenceTicks &&
    clip.stretchReferenceTempo
  ) {
    const referenceTickRate = ticksPerSecond(clip.stretchReferenceTempo);
    const nativeDurationSeconds =
      clip.stretchReferenceTicks / referenceTickRate;
    const targetDurationSeconds = clip.w / currentTickRate;
    playbackRate = nativeDurationSeconds / targetDurationSeconds;

    // Position/durée natives dans le buffer, proportionnelles à la fraction
    // du clip déjà écoulée (ex. démarrage en milieu de clip via un scrub) —
    // la même fraction s'applique dans le domaine natif et dans le domaine
    // cible puisque le stretch est uniforme sur toute la durée du clip.
    const fractionElapsed = playbackOffsetTicks / clip.w;
    offsetSeconds =
      clip.startOffset / referenceTickRate +
      fractionElapsed * nativeDurationSeconds;
    durationSeconds = (1 - fractionElapsed) * nativeDurationSeconds;
  } else {
    offsetSeconds = (clip.startOffset + playbackOffsetTicks) / currentTickRate;
    durationSeconds = (clip.w - playbackOffsetTicks) / currentTickRate;
  }

  return {
    offsetSeconds,
    durationSeconds,
    playbackRate,
    detuneCents,
    needsStretchEngine: playbackRate !== 1 || detuneCents !== 0,
  };
}

// Applique la règle de resize selon le mode toolbar actif. Sticky : une fois
// stretched, un clip le reste pour toujours, peu importe le mode toolbar au
// moment d'un resize ultérieur — celui-ci ne fait alors que ré-ancrer la
// référence (comme un warp marker), il ne peut jamais faire revenir un clip
// à un comportement de simple trim.
//
// Le geste de resize (useAudioClipResize.ts) produit x/w/startOffset dans le
// référentiel BRUT de la grille de ticks de la timeline (tempo-agnostique en
// tant que COMPTE de ticks, mais implicitement rattaché à la tempo COURANTE
// dès qu'on le convertit en secondes). Pour un clip déjà stretché,
// startOffset/stretchReferenceTicks sont eux interprétés à la tempo de
// RÉFÉRENCE (voir computeClipPlaybackParams) — donc tout delta produit par
// le drag doit être reconverti vers ce référentiel AVANT d'être appliqué, en
// utilisant le ratio de stretch (playbackRate) actuel comme facteur de
// conversion : convertToNativeTicks ci-dessous fait exactement ça, et sert
// aussi bien au décalage de départ (bord gauche) qu'à la largeur (bord
// droit), puisque c'est le même facteur de conversion linéaire dans les
// deux cas.
export function applyResizeStretch(
  prevClip: AudioClip,
  newTicks: { x: number; w: number; startOffset: number },
  toolbarMode: ClipResizeMode,
  currentTempo: number,
): Partial<AudioClip> {
  const shouldStretch = prevClip.stretched || toolbarMode === "stretch";
  if (!shouldStretch) return newTicks;

  if (
    !prevClip.stretched ||
    prevClip.stretchReferenceTicks === undefined ||
    prevClip.stretchReferenceTempo === undefined
  ) {
    // Premier passage en stretch : le clip n'était pas encore stretché,
    // startOffset est donc déjà dans le même référentiel que la tempo
    // courante — rien à convertir, ancrage initial simple.
    return {
      ...newTicks,
      stretched: true,
      stretchReferenceTicks: prevClip.w,
      stretchReferenceTempo: currentTempo,
    };
  }

  const referenceTickRate = ticksPerSecond(prevClip.stretchReferenceTempo);
  const currentTickRate = ticksPerSecond(currentTempo);
  const nativeDurationSecondsBefore =
    prevClip.stretchReferenceTicks / referenceTickRate;
  const targetDurationSecondsBefore = prevClip.w / currentTickRate;
  const playbackRateBefore =
    nativeDurationSecondsBefore / targetDurationSecondsBefore;

  // Facteur de conversion "tick de drag (référentiel timeline courant)" ->
  // "tick natif (référentiel de référence)", dérivé du ratio de stretch
  // actuel — voir dérivation dans la conversation/la mémoire du projet.
  const conversionFactor =
    playbackRateBefore * (referenceTickRate / currentTickRate);
  const startOffsetDeltaTicks = newTicks.startOffset - prevClip.startOffset;
  const startOffset =
    prevClip.startOffset + startOffsetDeltaTicks * conversionFactor;

  const base = {
    ...newTicks,
    startOffset,
    stretched: true as const,
    stretchReferenceTempo: prevClip.stretchReferenceTempo,
  };

  if (toolbarMode === "stretch") {
    // Mode "étirer" : on ne touche jamais la référence native déjà ancrée
    // (fix précédent) — la largeur pilote délibérément un NOUVEAU ratio de
    // stretch, recalculé par computeClipPlaybackParams à partir de cette
    // référence fixe. Seul le décalage de départ (bord gauche) est reconverti
    // dans le référentiel natif ici.
    return { ...base, stretchReferenceTicks: prevClip.stretchReferenceTicks };
  }

  // Mode "couper" sur un clip déjà stretché : le stretch (playbackRate) doit
  // rester EXACTEMENT identique — seuls le début et la fin de la fenêtre lue
  // sont ajustés, comme un trim classique mais sur l'audio déjà étiré (cas
  // d'usage : caler une loop 110bpm sur un projet à 120bpm, puis ajuster où
  // elle démarre/finit sans perdre le calage à 120). stretchReferenceTicks
  // est donc recalculé avec le MÊME conversionFactor pour que le NOUVEAU w
  // reproduise exactement playbackRateBefore.
  return { ...base, stretchReferenceTicks: newTicks.w * conversionFactor };
}
