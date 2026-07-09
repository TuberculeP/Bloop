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
  x: number; // Position horizontale (temps/position dans la séquence)
  y: number; // Position verticale (hauteur de note/pitch)
  w: number; // Largeur (durée de la note)
  h: number; // Hauteur (toujours 1 pour les notes MIDI)
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

export type InstrumentType =
  | "basicSynth"
  | "elementarySynth"
  | "smplr"
  | "undertale"
  | "audioTrack";

export type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

export interface BasicSynthConfig {
  type: "basicSynth";
  oscillatorType: OscillatorType;
  gain?: number;
}

export interface SmplrConfig {
  type: "smplr";
  soundfont: string;
  gain?: number;
}

export interface ElementarySynthConfig {
  type: "elementarySynth";
  preset?: string;
  gain?: number;
}

export interface UndertaleConfig {
  type: "undertale";
  instrument: string;
  gain?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
}

export interface AudioTrackConfig {
  type: "audioTrack";
  gain?: number;
}

export type InstrumentConfig =
  | BasicSynthConfig
  | SmplrConfig
  | ElementarySynthConfig
  | UndertaleConfig
  | AudioTrackConfig;

export interface InstrumentConfigUpdate {
  oscillatorType?: OscillatorType;
  soundfont?: string;
  preset?: string;
  instrument?: string;
  gain?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
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

export type AutomatableParam =
  | "volume"
  | "reverb"
  | "eq_sub"
  | "eq_bass"
  | "eq_mid"
  | "eq_presence"
  | "eq_brilliance";

export interface AutomationPoint {
  id: string;
  x: number; // position en colonnes (float)
  y: number; // valeur normalisée 0-1
}

export interface AutomationLane {
  id: string;
  parameter: AutomatableParam;
  points: AutomationPoint[];
}

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentConfig;
  color: string;
  volume: number; // 0-100
  reverb: number; // 0-100 (wet/dry mix)
  eqBands: EQBand[]; // EQ 5 bandes par piste
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

export interface TimelineProject {
  id?: string;
  name: string;
  tracks: Track[];
  cols: number; // Longueur totale de la timeline
  tempo: number; // BPM global
  volume: number; // Volume master (0-100)
  reverb: number; // Reverb master (0-100)
  eqBands?: EQBand[];
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
