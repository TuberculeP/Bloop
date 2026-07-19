export interface Foo {
  id: number;
  bar: string;
}

export type Note = {
  frequency: number;
  key: string;
  color: string;
  scale: string;
};

// Types pour le séquenceur de notes MIDI
export interface MidiNote {
  i: string; // ID unique de la note
  x: number; // Position horizontale (en ticks, TICKS_PER_BEAT par temps)
  y: number; // Position verticale (hauteur de note/pitch)
  w: number; // Largeur (durée de la note, en ticks)
  v?: number; // Vélocité (0-127), optionnelle — absente = 100 à la lecture
}

export type NoteName = string; // Type pour les noms de notes comme "C4", "A#5", etc.

export interface NoteEvent {
  noteId: string;
  noteName: NoteName;
  position: number;
  duration: number;
  velocity?: number;
}

// Types pour les événements du séquenceur
export type NoteStartHandler = (
  note: MidiNote,
  noteName: NoteName,
  position: number,
) => void;
export type NoteEndHandler = (
  note: MidiNote,
  noteName: NoteName,
  position: number,
) => void;

// Types pour la gestion multi-séquences
export interface Sequence {
  id: string;
  name: string;
  layout: MidiNote[];
  tempo: number;
  cols: number;
  createdAt: Date;
  updatedAt: Date;
  volume: number;
  reverb: number;
}

export interface EQBand {
  id: string;
  frequency: number;
  gain: number;
  type: "lowshelf" | "peaking" | "highshelf";
  label: string;
}

export interface MasterCompressorConfig {
  enabled: boolean;
  threshold: number; // dB, -100..0
  ratio: number; // 1..20
  attack: number; // s, 0..1
  release: number; // s, 0..1
  knee: number; // dB, 0..40
}

export interface MasterLimiterConfig {
  enabled: boolean;
  threshold: number; // dB (plafond de sortie), -100..0
  release: number; // s
}

export interface SequencerProject {
  sequences: Sequence[];
  activeSequenceId: string | null;
  projectName: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  volume: number;
  reverb: number;
  eqBands?: EQBand[];
  // Legacy support
  bass?: number;
  mid?: number;
  treble?: number;
}

// Format de sauvegarde compatible avec l'ancien système
export interface LegacySequenceData {
  layout: MidiNote[];
  tempo: number;
  cols: number;
  timestamp: string;
  version: string;
}

// ============================================
// Types pour le système multi-pistes (Timeline GarageBand-style)
// ============================================

// Clé du registre d'instruments (lib/audio/instruments/registry.ts) — plus
// une union fermée : un futur moteur externe peut s'enregistrer sans
// modifier ce fichier.
export type InstrumentType = string;

export type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

// Types internes documentaires par engine — ne composent plus l'union
// InstrumentConfig exportée (voir plus bas), gardés pour typer les
// constructeurs des engines concrets et leurs `definition.ts`. L'index
// signature est nécessaire pour rester structurellement assignable à
// InstrumentConfig (qui en a une) — sans elle, TS refuse l'assignation d'un
// type nommé (par opposition à un littéral) vers un type indexé.
export interface BasicSynthConfig {
  type: "basicSynth";
  oscillatorType: OscillatorType;
  gain?: number;
  [key: string]: unknown;
}

export interface SmplrConfig {
  type: "smplr";
  soundfont: string;
  gain?: number;
  [key: string]: unknown;
}

export interface ElementarySynthConfig {
  type: "elementarySynth";
  preset?: string;
  gain?: number;
  [key: string]: unknown;
}

export interface UndertaleConfig {
  type: "undertale";
  instrument: string;
  gain?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  [key: string]: unknown;
}

export interface AudioTrackConfig {
  type: "audioTrack";
  gain?: number;
  [key: string]: unknown;
}

// Forme ouverte, à l'image d'EffectInstanceConfig — le `type` est une clé du
// registre d'instruments, les champs spécifiques (oscillatorType, soundfont,
// attack...) vivent à plat pour rester compatibles avec les projets déjà
// sauvegardés.
export interface InstrumentConfig {
  type: string;
  gain?: number;
  [key: string]: unknown;
}

export interface AudioClip {
  id: string;
  sampleId: string;
  x: number;
  w: number;
  startOffset: number;
}

export interface AudioSample {
  id: string;
  name: string;
  packId: string;
  folder: string;
  filename: string;
  duration: number;
  waveformData?: number[];
  fullUrl: string;
}

export interface SampleFolder {
  id?: string;
  name: string;
  samples: AudioSample[];
}

export interface SamplePack {
  id: string;
  name: string;
  author?: string;
  featured?: boolean;
  cover?: string;
  folders: SampleFolder[];
}

// Un effet en cours d'exécution dans la pile d'une piste ou du bus master.
// `params` stocke des valeurs réelles (dB, %, etc.), pas normalisées — voir
// `lib/audio/effects/types.ts` (EffectParamDescriptor) pour la résolution
// dynamique min/max côté audio.
export interface EffectInstanceConfig {
  id: string; // uuid stable, sert d'ancre pour l'automation (AutomationTarget.effectId)
  type: string; // clé du registre, ex: "eq5" | "reverb" | "compressor" | "limiter" | "overdrive"
  enabled: boolean; // bypass
  params: Record<string, number>;
}

// Cible d'un paramètre automatisable : une piste (ou "master") + un effet de
// sa pile (ou la sentinelle "channel" pour le fader de volume, qui n'est pas
// dans la pile d'effets) + un paramètre de cet effet.
export interface AutomationTarget {
  trackId: string | "master";
  effectId: string; // EffectInstanceConfig.id, ou "channel" (fader volume)
  paramId: string; // paramId de l'effet, ou "volume" si effectId === "channel"
}

export interface AutomationPoint {
  id: string;
  x: number; // position en colonnes (float)
  y: number; // valeur normalisée 0-1
}

export interface AutomationLane {
  id: string;
  target: AutomationTarget;
  points: AutomationPoint[];
}

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentConfig;
  color: string;
  volume: number; // 0-100
  effects: EffectInstanceConfig[]; // pile d'effets réordonnable (EQ, reverb, etc.)
  muted: boolean;
  solo: boolean;
  order: number;
  notes: MidiNote[]; // Notes avec positions absolues sur la timeline (MIDI tracks)
  clips?: AudioClip[]; // Audio clips (audio tracks)
  automationLanes: AutomationLane[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Clip {
  id: string;
  trackId: string;
  notes: MidiNote[]; // Notes directement dans le clip
  x: number; // Position sur la timeline (en colonnes)
  w: number; // Largeur du clip (en colonnes)
  color?: string; // Override de la couleur de la piste
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSignature {
  numerator: number; // Nombre de temps par mesure (ex: 7 pour 7/8)
  denominator: number; // Valeur du temps (1,2,4,8,16,32 — ex: 8 pour 7/8)
}

export interface TimelineProject {
  id?: string;
  name: string;
  tracks: Track[];
  cols: number; // Longueur totale de la timeline (en ticks)
  tempo: number; // BPM global
  timeSignature: TimeSignature; // Signature rythmique (défaut 4/4)
  subdivision: number; // Résolution de la grille de snap (pas par temps, ex: 4 = double-croches)
  volume: number; // Volume master (0-100)
  effects: EffectInstanceConfig[]; // pile d'effets du bus master (EQ, reverb, compressor, limiter...)
  automationLanes?: AutomationLane[]; // Automation du bus master (volume + effets)
  usedSamples?: Record<string, AudioSample>; // Samples utilisés par les audio clips
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Couleurs disponibles pour les pistes
export const TRACK_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
] as const;

export type TrackColor = (typeof TRACK_COLORS)[number];

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: string;
  profilePicture?: string;
  following: User[];
  followers: Record<string, any>[];
  posts: Record<string, any>[];
  likedPosts: Record<string, any>[];
  subscription: Record<string, any>;
  sentMessages: Record<string, any>[];
  receivedMessages: Record<string, any>[];
  createdAt: Date;
};

export interface TagObject {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Post {
  id?: number;
  author: User;
  body: string;
  tags?: (string | TagObject)[];
  comment_of?: number | null;
  comment_of_post_id?: number | null;
  comments?: Post[];
  is_highlight?: boolean;
  highlight_on_tag?: boolean;
  pinned_by_user?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isLikedByMe?: boolean;
  likesCount?: number;
}
export interface CreatePostData {
  body: string;
  tags?: string[];
  comment_of_post_id?: string | null;
  is_highlight?: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  mcpEnabled: boolean;
  isPublic: boolean;
  deletedAt?: string;
}

export type TrashedProjectListItem = ProjectListItem & { deletedAt: string };

export interface PublicProjectListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  owner: { id: string; firstName: string; lastName: string };
}

export type FavoriteProjectListItem = PublicProjectListItem & {
  favoriteId: string;
  favoritedAt: string;
};

export interface LearningArticle {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  coverImage?: string;
  author: User;
  status: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  score?: number;
  myVote?: number;
}

export interface CreateLearningArticleData {
  title: string;
  body: string;
  excerpt?: string;
  coverImage?: string;
  status: "draft" | "published";
}
