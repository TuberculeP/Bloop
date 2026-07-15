import type { TimeSignature, TimelineProject } from "../utils/types";

// Résolution fixe de stockage des positions (notes, clips, automation).
// 96 = PPCM des subdivisions autorisées (1,2,3,4,6,8,12,16,24,32) : toute
// subdivision snap se traduit en un nombre entier de ticks, binaire ou ternaire.
export const TICKS_PER_BEAT = 96;

export const SUBDIVISION_PRESETS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32] as const;

export const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

export const DEFAULT_SUBDIVISION = 4;

// Les projets antérieurs à ce chantier stockaient 1 colonne = 1 double-croche
// (4 colonnes par temps). Facteur de conversion vers la grille en ticks.
const LEGACY_COLS_PER_BEAT = 4;
export const LEGACY_TO_TICKS_SCALE = TICKS_PER_BEAT / LEGACY_COLS_PER_BEAT; // 24

export const ticksPerBar = (timeSignature: TimeSignature): number =>
  timeSignature.numerator * TICKS_PER_BEAT;

export const snapTicks = (subdivision: number): number =>
  TICKS_PER_BEAT / subdivision;

export const snapToGrid = (ticks: number, subdivision: number): number => {
  const step = snapTicks(subdivision);
  return Math.round(ticks / step) * step;
};

// Ticks écoulés par seconde à un tempo donné. Ne dépend pas de la subdivision
// (qui n'est qu'un réglage de snap visuel) ni du dénominateur de la mesure :
// le tempo exprime toujours des temps (au sens de la signature) par minute.
export const ticksPerSecond = (tempo: number): number =>
  (tempo / 60) * TICKS_PER_BEAT;

export const barBeatFromTick = (
  tick: number,
  timeSignature: TimeSignature,
): { bar: number; beat: number } => {
  const barLength = ticksPerBar(timeSignature);
  const bar = Math.floor(tick / barLength);
  const beat = Math.floor((tick % barLength) / TICKS_PER_BEAT);
  return { bar: bar + 1, beat: beat + 1 };
};

export const pxPerTick = (pxPerBeat: number): number =>
  pxPerBeat / TICKS_PER_BEAT;

// Plage de ticks visible dans un canvas virtualisé (piano roll, preview de
// piste) : marge d'une colonne de part et d'autre de la plage strictement
// visible pour éviter qu'une note pile à la frontière du viewport disparaisse
// ou devienne non cliquable.
export const getVisibleTickRange = (
  scrollLeft: number,
  viewportWidth: number,
  colWidth: number,
  cols: number,
): [number, number] => {
  const start = Math.max(0, Math.floor(scrollLeft / colWidth) - 1);
  const end = Math.min(
    cols,
    Math.ceil((scrollLeft + viewportWidth) / colWidth) + 1,
  );
  return [start, end];
};

// Un projet est "ancien format" (positions en colonnes de double-croche) s'il
// n'a pas encore de timeSignature/subdivision — indépendamment du champ version.
export const isLegacyProject = (data: Partial<TimelineProject>): boolean =>
  !data.timeSignature || typeof data.subdivision !== "number";

// Convertit un projet ancien format vers la grille en ticks, en préservant la
// position musicale de chaque note/clip/point d'automation (multiplication par
// un facteur entier, donc sans perte). No-op si le projet est déjà en ticks.
export const migrateLegacyProject = (
  data: TimelineProject,
): TimelineProject => {
  if (!isLegacyProject(data)) return data;

  const scale = LEGACY_TO_TICKS_SCALE;
  const scalePoints = (points?: { x: number }[]) =>
    points?.forEach((point) => {
      point.x = Math.round(point.x * scale);
    });

  data.cols = Math.round((data.cols ?? 0) * scale);
  data.tracks.forEach((track) => {
    track.notes?.forEach((note) => {
      note.x = Math.round(note.x * scale);
      note.w = Math.round(note.w * scale);
      delete (note as unknown as { h?: number }).h;
    });
    track.clips?.forEach((clip) => {
      clip.x = Math.round(clip.x * scale);
      clip.w = Math.round(clip.w * scale);
      clip.startOffset = Math.round(clip.startOffset * scale);
    });
    track.automationLanes?.forEach((lane) => scalePoints(lane.points));
  });
  data.automationLanes?.forEach((lane) => scalePoints(lane.points));

  data.timeSignature = { ...DEFAULT_TIME_SIGNATURE };
  data.subdivision = DEFAULT_SUBDIVISION;
  return data;
};
