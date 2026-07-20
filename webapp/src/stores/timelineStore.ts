import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type {
  Track,
  TimelineProject,
  MidiNote,
  AudioClip,
  AudioSample,
  InstrumentConfig,
  InstrumentType,
  TrackColor,
  AutomationTarget,
  AutomationLane,
  AutomationPoint,
  EffectInstanceConfig,
  TimeSignature,
} from "../lib/utils/types";
import { TRACK_COLORS } from "../lib/utils/types";
import {
  cloneEQBands,
  cloneCompressorConfig,
  cloneLimiterConfig,
} from "../lib/audio/config";
import { getEffectDefinition } from "../lib/audio/effects";
import {
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_SUBDIVISION,
  LEGACY_TO_TICKS_SCALE,
  migrateLegacyProject,
} from "../lib/audio/timeGrid";
import { useProjectStore } from "./projectStore";
import { useUiLayoutPreference } from "../composables/useUiLayoutStorage";

const STORAGE_KEY = "bloop-timeline-project";
const CURRENT_PROJECT_VERSION = "6.0";
const DEFAULT_COLS = 128 * LEGACY_TO_TICKS_SCALE; // 8 mesures en 4/4
const DEFAULT_TEMPO = 120;
const DEFAULT_VOLUME = 100;

// ============================================
// Effets : création + migration depuis l'ancien format
// ============================================

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const createEffectInstanceConfig = (type: string): EffectInstanceConfig => {
  const definition = getEffectDefinition(type);
  if (!definition) throw new Error(`Unknown effect type: ${type}`);
  return {
    id: generateId("effect"),
    type,
    enabled: true,
    params: definition.createDefaultParams(),
  };
};

// Bus master d'un nouveau projet : EQ + Reverb par défaut (comportement
// identique à l'ancien `eqBands`/`reverb` toujours présents). Les nouvelles
// pistes, elles, démarrent sans effet — l'utilisateur en ajoute depuis le rack.
const createDefaultMasterEffects = (): EffectInstanceConfig[] => [
  createEffectInstanceConfig("eq5"),
  createEffectInstanceConfig("reverb"),
];

// Convertit un ancien `AutomatableParam` (union fermée) en cible générique,
// en pointant vers l'id de l'effet EQ/Reverb migré correspondant.
const migrateAutomationTarget = (
  parameter: string,
  trackId: string,
  eqEffectId: string,
  reverbEffectId: string,
): AutomationTarget => {
  if (parameter === "volume") {
    return { trackId, effectId: "channel", paramId: "volume" };
  }
  if (parameter === "reverb") {
    return { trackId, effectId: reverbEffectId, paramId: "amount" };
  }
  const bandId = parameter.replace("eq_", "");
  return { trackId, effectId: eqEffectId, paramId: `${bandId}_gain` };
};

// Migration in-place d'une piste chargée depuis un projet antérieur à ce
// chantier (`track.reverb`/`track.eqBands` -> `track.effects`, et
// `lane.parameter` -> `lane.target`). No-op si déjà migrée.
const migrateTrackEffects = (track: any): void => {
  if (Array.isArray(track.effects)) return;

  const eqBands = track.eqBands ?? cloneEQBands();
  const reverbAmount = track.reverb ?? 0;

  const eqEffect = createEffectInstanceConfig("eq5");
  for (const band of eqBands) {
    eqEffect.params[`${band.id}_gain`] = band.gain;
  }

  const reverbEffect = createEffectInstanceConfig("reverb");
  reverbEffect.params.amount = reverbAmount;

  track.effects = [eqEffect, reverbEffect];

  for (const lane of track.automationLanes ?? []) {
    if (lane.target) continue;
    lane.target = migrateAutomationTarget(
      lane.parameter,
      track.id,
      eqEffect.id,
      reverbEffect.id,
    );
    delete lane.parameter;
  }

  delete track.reverb;
  delete track.eqBands;
};

// Idem pour le bus master (`project.compressor`/`project.limiter` ne
// deviennent des entrées de la pile que s'ils étaient `enabled`, sinon ils
// étaient déjà transparents et l'absence d'entrée produit le même résultat).
const migrateMasterEffects = (data: any): void => {
  if (Array.isArray(data.effects)) return;

  const eqBands = data.eqBands ?? cloneEQBands();
  const reverbAmount = data.reverb ?? 0;
  const compressorConfig = data.compressor ?? cloneCompressorConfig();
  const limiterConfig = data.limiter ?? cloneLimiterConfig();

  const eqEffect = createEffectInstanceConfig("eq5");
  for (const band of eqBands) {
    eqEffect.params[`${band.id}_gain`] = band.gain;
  }

  const reverbEffect = createEffectInstanceConfig("reverb");
  reverbEffect.params.amount = reverbAmount;

  const effects: EffectInstanceConfig[] = [eqEffect, reverbEffect];

  if (compressorConfig.enabled) {
    const compressorEffect = createEffectInstanceConfig("compressor");
    compressorEffect.params = {
      threshold: compressorConfig.threshold,
      ratio: compressorConfig.ratio,
      attack: compressorConfig.attack,
      release: compressorConfig.release,
      knee: compressorConfig.knee,
    };
    effects.push(compressorEffect);
  }

  if (limiterConfig.enabled) {
    const limiterEffect = createEffectInstanceConfig("limiter");
    limiterEffect.params = {
      threshold: limiterConfig.threshold,
      release: limiterConfig.release,
    };
    effects.push(limiterEffect);
  }

  data.effects = effects;

  for (const lane of data.automationLanes ?? []) {
    if (lane.target) continue;
    lane.target = migrateAutomationTarget(
      lane.parameter,
      "master",
      eqEffect.id,
      reverbEffect.id,
    );
    delete lane.parameter;
  }

  delete data.reverb;
  delete data.eqBands;
  delete data.compressor;
  delete data.limiter;
};

export const useTimelineStore = defineStore("timelineStore", () => {
  // ============================================
  // État du projet
  // ============================================
  const project = ref<TimelineProject>({
    name: "Nouveau Projet",
    tracks: [],
    cols: DEFAULT_COLS,
    tempo: DEFAULT_TEMPO,
    timeSignature: { ...DEFAULT_TIME_SIGNATURE },
    subdivision: DEFAULT_SUBDIVISION,
    volume: DEFAULT_VOLUME,
    effects: createDefaultMasterEffects(),
    automationLanes: [],
    version: CURRENT_PROJECT_VERSION,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ============================================
  // État de l'édition
  // ============================================
  const activeTrackId = ref<string | null>(null);
  // Piste armée pour recevoir l'input live (clavier MIDI) : une seule à la fois.
  const armedTrackId = ref<string | null>(null);
  const expandedTrackId = ref<string | null>(null);
  const automationExpandedTrackId = ref<string | null>(null);
  const automationExpandedMaster = ref(false);
  const isLoadingProject = ref(false); // Flag pour ignorer markAsChanged pendant le chargement
  const metronomeEnabled = useUiLayoutPreference("metronome-enabled", false);
  // Aide d'édition éphémère (non persistée) : dernière largeur donnée à une
  // note via un resize individuel, utilisée comme largeur par défaut pour la
  // prochaine note posée au clic dans le piano roll.
  const lastResizedNoteWidth = ref<number | null>(null);
  // Zoom horizontal de la timeline : préférence de vue par navigateur, pas
  // une donnée de projet (non partagée entre collaborateurs).
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 4;
  const zoomLevel = useUiLayoutPreference("timeline-zoom", 1);
  // Vitesse du zoom Ctrl+molette/pincement trackpad : le delta d'un geste de
  // pincement macOS est bien plus faible que celui d'un clic de molette, d'où
  // un réglage par utilisateur plutôt qu'une constante unique. 1-20, défaut 5.
  const ZOOM_WHEEL_SPEED_MIN = 1;
  const ZOOM_WHEEL_SPEED_MAX = 20;
  const zoomWheelSpeed = useUiLayoutPreference("timeline-zoom-wheel-speed", 5);

  // ============================================
  // Computed Properties
  // ============================================

  const tracks = computed(() => project.value.tracks);

  const tempo = computed({
    get: () => project.value.tempo,
    set: (value: number) => {
      project.value.tempo = value;
      project.value.updatedAt = new Date();
    },
  });

  const timeSignature = computed<TimeSignature>({
    get: () => project.value.timeSignature ?? DEFAULT_TIME_SIGNATURE,
    set: (value: TimeSignature) => {
      project.value.timeSignature = value;
      project.value.updatedAt = new Date();
    },
  });

  const subdivision = computed({
    get: () => project.value.subdivision ?? DEFAULT_SUBDIVISION,
    set: (value: number) => {
      project.value.subdivision = value;
      project.value.updatedAt = new Date();
    },
  });

  const volume = computed({
    get: () => project.value.volume,
    set: (value: number) => {
      project.value.volume = value;
      project.value.updatedAt = new Date();
    },
  });

  const masterEffects = computed(() => project.value.effects);

  const masterAutomationLanes = computed(
    () => project.value.automationLanes ?? [],
  );

  const activeTrack = computed<Track | null>(() => {
    if (!activeTrackId.value) return null;
    return (
      project.value.tracks.find((t) => t.id === activeTrackId.value) || null
    );
  });

  const expandedTrack = computed<Track | null>(() => {
    if (!expandedTrackId.value) return null;
    return (
      project.value.tracks.find((t) => t.id === expandedTrackId.value) || null
    );
  });

  // Pistes triées par ordre
  const sortedTracks = computed(() =>
    [...project.value.tracks].sort((a, b) => a.order - b.order),
  );

  // ============================================
  // Utilitaires
  // ============================================

  const generateNoteId = (trackId: string): string => {
    return `${trackId}_note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  };

  const generateClipId = (trackId: string): string => {
    return `${trackId}_clip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  };

  const getNextTrackColor = (): TrackColor => {
    const usedColors = new Set(project.value.tracks.map((t) => t.color));
    const available = TRACK_COLORS.filter((c) => !usedColors.has(c));
    if (available.length > 0) {
      return available[0];
    }
    return TRACK_COLORS[project.value.tracks.length % TRACK_COLORS.length];
  };

  const getNextTrackOrder = (): number => {
    if (project.value.tracks.length === 0) return 0;
    return Math.max(...project.value.tracks.map((t) => t.order)) + 1;
  };

  const generateTrackName = (instrumentType: InstrumentType): string => {
    const baseNames: Record<InstrumentType, string> = {
      basicSynth: "Synth",
      elementarySynth: "Elementary",
      smplr: "Sampler",
      undertale: "Undertale",
      audioTrack: "Audio",
    };
    const baseName = baseNames[instrumentType];
    let counter = 1;
    let name = `${baseName} ${counter}`;

    while (project.value.tracks.some((t) => t.name === name)) {
      counter++;
      name = `${baseName} ${counter}`;
    }

    return name;
  };

  // ============================================
  // Actions - Tracks
  // ============================================

  const createTrack = (instrument: InstrumentConfig, name?: string): string => {
    const trackId = generateId("track");
    const newTrack: Track = {
      id: trackId,
      name: name || generateTrackName(instrument.type),
      instrument,
      color: getNextTrackColor(),
      volume: 100,
      effects: [],
      muted: false,
      solo: false,
      order: getNextTrackOrder(),
      notes: [],
      automationLanes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    project.value.tracks.push(newTrack);
    project.value.updatedAt = new Date();
    activeTrackId.value = trackId;

    return trackId;
  };

  const deleteTrack = (trackId: string): boolean => {
    const index = project.value.tracks.findIndex((t) => t.id === trackId);
    if (index === -1) return false;

    // Supprimer la piste
    project.value.tracks.splice(index, 1);
    project.value.updatedAt = new Date();

    // Mettre à jour la sélection
    if (activeTrackId.value === trackId) {
      activeTrackId.value =
        project.value.tracks.length > 0 ? project.value.tracks[0].id : null;
    }

    if (armedTrackId.value === trackId) {
      armedTrackId.value = null;
    }

    // Fermer le piano roll si c'était cette piste
    if (expandedTrackId.value === trackId) {
      expandedTrackId.value = null;
    }

    // Clear undo/redo history for this track
    import("./trackHistoryStore").then(({ useTrackHistoryStore }) => {
      useTrackHistoryStore().clearTrackHistory(trackId);
    });

    return true;
  };

  const armTrack = (trackId: string): void => {
    armedTrackId.value = trackId;
  };

  const unarmTrack = (): void => {
    armedTrackId.value = null;
  };

  const updateTrack = (trackId: string, updates: Partial<Track>): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    Object.assign(track, updates, { updatedAt: new Date() });
    project.value.updatedAt = new Date();
    return true;
  };

  const renameTrack = (trackId: string, newName: string): boolean => {
    return updateTrack(trackId, { name: newName });
  };

  const setTrackMuted = (trackId: string, muted: boolean): boolean => {
    return updateTrack(trackId, { muted });
  };

  const setTrackSolo = (trackId: string, solo: boolean): boolean => {
    return updateTrack(trackId, { solo });
  };

  const setTrackVolume = (trackId: string, volume: number): boolean => {
    return updateTrack(trackId, { volume: Math.max(0, Math.min(100, volume)) });
  };

  const updateTrackInstrument = (
    trackId: string,
    config: Partial<InstrumentConfig>,
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    track.instrument = { ...track.instrument, ...config };
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return true;
  };

  const reorderTracks = (fromIndex: number, toIndex: number): boolean => {
    const sorted = sortedTracks.value;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= sorted.length ||
      toIndex >= sorted.length
    ) {
      return false;
    }

    // Réorganiser les ordres
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);

    // Mettre à jour les ordres
    sorted.forEach((track, index) => {
      const original = project.value.tracks.find((t) => t.id === track.id);
      if (original) {
        original.order = index;
      }
    });

    project.value.updatedAt = new Date();
    return true;
  };

  // ============================================
  // Actions - Notes sur Track
  // ============================================

  const addNoteToTrack = (
    trackId: string,
    note: Omit<MidiNote, "i">,
  ): string | null => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return null;

    const noteId = generateNoteId(trackId);
    const newNote: MidiNote = {
      ...note,
      i: noteId,
    };

    track.notes.push(newNote);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return noteId;
  };

  const removeNoteFromTrack = (trackId: string, noteId: string): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    const index = track.notes.findIndex((n) => n.i === noteId);
    if (index === -1) return false;

    track.notes.splice(index, 1);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return true;
  };

  const updateNoteInTrack = (
    trackId: string,
    noteId: string,
    updates: Partial<MidiNote>,
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    const note = track.notes.find((n) => n.i === noteId);
    if (!note) return false;

    Object.assign(note, updates);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return true;
  };

  const setTrackNotes = (trackId: string, notes: MidiNote[]): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    track.notes = notes;
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return true;
  };

  // ============================================
  // Actions - Audio Clips sur Track
  // ============================================

  const addClipToTrack = (
    trackId: string,
    clip: Omit<AudioClip, "id">,
    sample?: AudioSample,
  ): string | null => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return null;

    if (!track.clips) {
      track.clips = [];
    }

    const clipId = generateClipId(trackId);
    const newClip: AudioClip = {
      ...clip,
      id: clipId,
    };

    track.clips.push(newClip);

    // Stocker les métadonnées du sample pour la persistence
    if (sample) {
      if (!project.value.usedSamples) {
        project.value.usedSamples = {};
      }
      project.value.usedSamples[sample.id] = sample;
    }

    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return clipId;
  };

  const removeClipFromTrack = (trackId: string, clipId: string): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track || !track.clips) return false;

    const index = track.clips.findIndex((c) => c.id === clipId);
    if (index === -1) return false;

    track.clips.splice(index, 1);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return true;
  };

  const updateClipInTrack = (
    trackId: string,
    clipId: string,
    updates: Partial<AudioClip>,
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track || !track.clips) return false;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return false;

    Object.assign(clip, updates);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return true;
  };

  const splitClipInTrack = (
    trackId: string,
    clipId: string,
    cutPosition: number,
  ): string | null => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track || !track.clips) return null;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return null;

    // cutPosition doit être strictement à l'intérieur du clip
    if (cutPosition <= clip.x || cutPosition >= clip.x + clip.w) return null;

    const rightW = clip.x + clip.w - cutPosition;
    const rightStartOffset = clip.startOffset + (cutPosition - clip.x);

    clip.w = cutPosition - clip.x; // le clip existant devient la partie gauche

    const rightClipId = addClipToTrack(trackId, {
      sampleId: clip.sampleId,
      x: cutPosition,
      w: rightW,
      startOffset: rightStartOffset,
    });

    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return rightClipId;
  };

  const setTrackClips = (trackId: string, clips: AudioClip[]): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    track.clips = clips;
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();

    return true;
  };

  const getTrackClipsAtPosition = (
    trackId: string,
    position: number,
  ): AudioClip[] => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track || !track.clips) return [];

    return track.clips.filter(
      (clip) => position >= clip.x && position < clip.x + clip.w,
    );
  };

  // ============================================
  // Actions - Piano Roll Expand/Collapse
  // ============================================

  const expandTrack = (trackId: string): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    expandedTrackId.value = trackId;
    activeTrackId.value = trackId;
    return true;
  };

  const collapseTrack = (): void => {
    expandedTrackId.value = null;
  };

  const toggleTrackExpanded = (trackId: string): void => {
    if (expandedTrackId.value === trackId) {
      collapseTrack();
    } else {
      expandTrack(trackId);
    }
  };

  const setLastResizedNoteWidth = (width: number): void => {
    lastResizedNoteWidth.value = width;
  };

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

  const setZoomLevel = (value: number): void => {
    zoomLevel.value = clamp(value, ZOOM_MIN, ZOOM_MAX);
  };

  const setZoomWheelSpeed = (value: number): void => {
    zoomWheelSpeed.value = clamp(
      value,
      ZOOM_WHEEL_SPEED_MIN,
      ZOOM_WHEEL_SPEED_MAX,
    );
  };

  const toggleAutomationExpanded = (trackId: string): void => {
    automationExpandedTrackId.value =
      automationExpandedTrackId.value === trackId ? null : trackId;
  };

  const toggleMasterAutomationExpanded = (): void => {
    automationExpandedMaster.value = !automationExpandedMaster.value;
  };

  const setActiveTrack = (trackId: string | null): void => {
    activeTrackId.value = trackId;
  };

  // ============================================
  // Actions - Playback Helpers
  // ============================================

  const getPlayableTracks = (): Track[] => {
    const hasSolo = project.value.tracks.some((t) => t.solo);

    return project.value.tracks.filter((track) => {
      if (track.muted) return false;
      if (hasSolo && !track.solo) return false;
      return true;
    });
  };

  const getNotesAtPosition = (
    notes: MidiNote[],
    position: number,
  ): MidiNote[] => {
    return notes.filter(
      (note) => position >= note.x && position < note.x + note.w,
    );
  };

  const getTrackNotesAtPosition = (
    trackId: string,
    position: number,
  ): MidiNote[] => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return [];
    return getNotesAtPosition(track.notes, position);
  };

  // ============================================
  // Actions - Effets (pile réordonnable, tracks + master)
  // ============================================

  const getEffectsArray = (
    trackId: string | "master",
  ): EffectInstanceConfig[] | undefined => {
    if (trackId === "master") return project.value.effects;
    return project.value.tracks.find((t) => t.id === trackId)?.effects;
  };

  const markTrackOrProjectUpdated = (trackId: string | "master"): void => {
    if (trackId !== "master") {
      const track = project.value.tracks.find((t) => t.id === trackId);
      if (track) track.updatedAt = new Date();
    }
    project.value.updatedAt = new Date();
  };

  const addEffect = (
    trackId: string | "master",
    type: string,
  ): string | null => {
    const effects = getEffectsArray(trackId);
    if (!effects) return null;

    const config = createEffectInstanceConfig(type);
    effects.push(config);
    markTrackOrProjectUpdated(trackId);
    return config.id;
  };

  const removeEffect = (
    trackId: string | "master",
    effectId: string,
  ): boolean => {
    const effects = getEffectsArray(trackId);
    const index = effects?.findIndex((e) => e.id === effectId) ?? -1;
    if (!effects || index === -1) return false;

    effects.splice(index, 1);
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  const reorderEffect = (
    trackId: string | "master",
    fromIndex: number,
    toIndex: number,
  ): boolean => {
    const effects = getEffectsArray(trackId);
    if (
      !effects ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= effects.length ||
      toIndex >= effects.length
    ) {
      return false;
    }

    const [moved] = effects.splice(fromIndex, 1);
    effects.splice(toIndex, 0, moved);
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  const setEffectEnabled = (
    trackId: string | "master",
    effectId: string,
    enabled: boolean,
  ): boolean => {
    const effect = getEffectsArray(trackId)?.find((e) => e.id === effectId);
    if (!effect) return false;

    effect.enabled = enabled;
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  const updateEffectParam = (
    trackId: string | "master",
    effectId: string,
    paramId: string,
    value: number,
  ): boolean => {
    const effect = getEffectsArray(trackId)?.find((e) => e.id === effectId);
    if (!effect || !Number.isFinite(value)) return false;

    effect.params[paramId] = value;
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  // ============================================
  // Actions - Automation Lanes (tracks + master, ciblage générique)
  // ============================================

  const getAutomationLanesArray = (
    trackId: string | "master",
  ): AutomationLane[] | undefined => {
    if (trackId === "master") {
      if (!project.value.automationLanes) project.value.automationLanes = [];
      return project.value.automationLanes;
    }
    return project.value.tracks.find((t) => t.id === trackId)?.automationLanes;
  };

  const isSameAutomationTarget = (
    a: AutomationTarget,
    b: AutomationTarget,
  ): boolean =>
    a.trackId === b.trackId &&
    a.effectId === b.effectId &&
    a.paramId === b.paramId;

  const addAutomationLane = (target: AutomationTarget): string | null => {
    const lanes = getAutomationLanesArray(target.trackId);
    if (!lanes) return null;

    if (lanes.some((l) => isSameAutomationTarget(l.target, target))) {
      return null;
    }

    const laneId = generateId("lane");
    lanes.push({ id: laneId, target, points: [] });
    markTrackOrProjectUpdated(target.trackId);
    return laneId;
  };

  const removeAutomationLane = (
    trackId: string | "master",
    laneId: string,
  ): boolean => {
    const lanes = getAutomationLanesArray(trackId);
    const index = lanes?.findIndex((l) => l.id === laneId) ?? -1;
    if (!lanes || index === -1) return false;

    lanes.splice(index, 1);
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  const addAutomationPoint = (
    trackId: string | "master",
    laneId: string,
    point: Omit<AutomationPoint, "id">,
  ): string | null => {
    const lane = getAutomationLanesArray(trackId)?.find((l) => l.id === laneId);
    if (!lane) return null;

    const pointId = generateId("pt");
    lane.points.push({ ...point, id: pointId });
    lane.points.sort((a, b) => a.x - b.x);
    markTrackOrProjectUpdated(trackId);
    return pointId;
  };

  const updateAutomationPoint = (
    trackId: string | "master",
    laneId: string,
    pointId: string,
    updates: Partial<Pick<AutomationPoint, "x" | "y">>,
  ): boolean => {
    const lane = getAutomationLanesArray(trackId)?.find((l) => l.id === laneId);
    const point = lane?.points.find((p) => p.id === pointId);
    if (!lane || !point) return false;

    Object.assign(point, updates);
    lane.points.sort((a, b) => a.x - b.x);
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  const removeAutomationPoint = (
    trackId: string | "master",
    laneId: string,
    pointId: string,
  ): boolean => {
    const lane = getAutomationLanesArray(trackId)?.find((l) => l.id === laneId);
    if (!lane) return false;

    const index = lane.points.findIndex((p) => p.id === pointId);
    if (index === -1) return false;

    lane.points.splice(index, 1);
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  const setAutomationPoints = (
    trackId: string | "master",
    laneId: string,
    points: AutomationPoint[],
  ): boolean => {
    const lane = getAutomationLanesArray(trackId)?.find((l) => l.id === laneId);
    if (!lane) return false;

    lane.points = [...points].sort((a, b) => a.x - b.x);
    markTrackOrProjectUpdated(trackId);
    return true;
  };

  // ============================================
  // Persistence
  // ============================================

  const saveToLocalStorage = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project.value));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde locale:", error);
    }
  };

  // Le watcher deep sur `project` déclenche saveToLocalStorage() à chaque
  // mutation, y compris les mutations à la volée pendant un drag (clip,
  // note, point d'automation). JSON.stringify + localStorage.setItem sur
  // tout le projet est synchrone et coûteux : on le debounce pour ne pas
  // bloquer le thread principal (et donc la boucle rAF du playback) en
  // rafale. `flushSaveToLocalStorage` garantit qu'on ne perd pas les
  // dernières modifications si l'utilisateur ferme l'onglet juste après.
  let saveDebounceId: ReturnType<typeof setTimeout> | null = null;
  const SAVE_DEBOUNCE_MS = 500;

  const scheduleSaveToLocalStorage = (): void => {
    if (saveDebounceId) clearTimeout(saveDebounceId);
    saveDebounceId = setTimeout(() => {
      saveDebounceId = null;
      saveToLocalStorage();
    }, SAVE_DEBOUNCE_MS);
  };

  const flushSaveToLocalStorage = (): void => {
    if (!saveDebounceId) return;
    clearTimeout(saveDebounceId);
    saveDebounceId = null;
    saveToLocalStorage();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushSaveToLocalStorage);
  }

  const loadFromLocalStorage = (): boolean => {
    isLoadingProject.value = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        isLoadingProject.value = false;
        return false;
      }

      const data = JSON.parse(saved) as TimelineProject;

      // Validation basique
      if (!data.tracks || !Array.isArray(data.tracks)) {
        isLoadingProject.value = false;
        return false;
      }

      // Migration vers la grille en ticks pour les projets antérieurs à ce chantier
      migrateLegacyProject(data);
      migrateMasterEffects(data);
      data.version = CURRENT_PROJECT_VERSION;

      // Convertir les dates
      data.createdAt = new Date(data.createdAt);
      data.updatedAt = new Date(data.updatedAt);
      data.tracks.forEach((track) => {
        track.createdAt = new Date(track.createdAt);
        track.updatedAt = new Date(track.updatedAt);
        // S'assurer que notes existe
        if (!track.notes) {
          track.notes = [];
        }
        // S'assurer que clips existe pour les audio tracks
        if (track.instrument.type === "audioTrack" && !track.clips) {
          track.clips = [];
        }
        if (!track.automationLanes) {
          track.automationLanes = [];
        }
        migrateTrackEffects(track);
      });

      if (!data.automationLanes) {
        data.automationLanes = [];
      }

      project.value = data;
      setTimeout(() => {
        isLoadingProject.value = false;
      }, 0);
      return true;
    } catch (error) {
      console.error("Erreur lors du chargement local:", error);
      isLoadingProject.value = false;
      return false;
    }
  };

  const loadProjectData = (data: TimelineProject): void => {
    isLoadingProject.value = true;

    // Migration vers la grille en ticks pour les projets antérieurs à ce chantier
    migrateLegacyProject(data);
    migrateMasterEffects(data);
    data.version = CURRENT_PROJECT_VERSION;

    // Convertir les dates
    data.createdAt = new Date(data.createdAt);
    data.updatedAt = new Date(data.updatedAt);
    data.tracks.forEach((track) => {
      track.createdAt = new Date(track.createdAt);
      track.updatedAt = new Date(track.updatedAt);
      if (!track.notes) {
        track.notes = [];
      }
      // S'assurer que clips existe pour les audio tracks
      if (track.instrument.type === "audioTrack" && !track.clips) {
        track.clips = [];
      }
      if (!track.automationLanes) {
        track.automationLanes = [];
      }
      migrateTrackEffects(track);
    });

    if (!data.automationLanes) {
      data.automationLanes = [];
    }

    project.value = data;

    // Restaurer les métadonnées des samples utilisés dans audioLibraryStore
    if (data.usedSamples) {
      import("./audioLibraryStore").then(({ useAudioLibraryStore }) => {
        const audioLibraryStore = useAudioLibraryStore();
        audioLibraryStore.restoreSamples(data.usedSamples!);
      });
    }

    // Clear all undo/redo history when loading a new project
    import("./trackHistoryStore").then(({ useTrackHistoryStore }) => {
      useTrackHistoryStore().clearAllHistory();
    });

    // Reset le flag après que Vue ait traité le changement
    setTimeout(() => {
      isLoadingProject.value = false;
    }, 0);
  };

  const exportProject = (): void => {
    const dataStr = JSON.stringify(project.value, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${project.value.name.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renameProject = (newName: string): void => {
    project.value.name = newName;
    project.value.updatedAt = new Date();
  };

  const createNewProject = (name: string = "Nouveau Projet"): void => {
    isLoadingProject.value = true;
    project.value = {
      name,
      tracks: [],
      cols: DEFAULT_COLS,
      tempo: DEFAULT_TEMPO,
      timeSignature: { ...DEFAULT_TIME_SIGNATURE },
      subdivision: DEFAULT_SUBDIVISION,
      volume: DEFAULT_VOLUME,
      effects: createDefaultMasterEffects(),
      automationLanes: [],
      version: CURRENT_PROJECT_VERSION,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    activeTrackId.value = null;
    expandedTrackId.value = null;

    // Clear all undo/redo history
    import("./trackHistoryStore").then(({ useTrackHistoryStore }) => {
      useTrackHistoryStore().clearAllHistory();
    });

    setTimeout(() => {
      isLoadingProject.value = false;
    }, 0);
  };

  // ============================================
  // Initialisation
  // ============================================

  const initialize = (): void => {
    if (!loadFromLocalStorage()) {
      createNewProject();
    }
  };

  // Auto-save et détection de changements
  watch(
    project,
    () => {
      scheduleSaveToLocalStorage();
      // Ne pas marquer comme "changed" pendant le chargement d'un projet
      if (!isLoadingProject.value) {
        const projectStore = useProjectStore();
        projectStore.markAsChanged();
      }
    },
    { deep: true },
  );

  return {
    // État
    project,
    tracks,
    sortedTracks,
    tempo,
    timeSignature,
    subdivision,
    volume,
    masterEffects,
    masterAutomationLanes,

    // État édition
    activeTrackId,
    activeTrack,
    armedTrackId,
    expandedTrackId,
    expandedTrack,
    automationExpandedMaster,
    metronomeEnabled,
    lastResizedNoteWidth,
    zoomLevel,
    zoomWheelSpeed,

    // Actions - Tracks
    createTrack,
    deleteTrack,
    armTrack,
    unarmTrack,
    updateTrack,
    renameTrack,
    setTrackMuted,
    setTrackSolo,
    setTrackVolume,
    updateTrackInstrument,
    reorderTracks,

    // Actions - Notes
    addNoteToTrack,
    removeNoteFromTrack,
    updateNoteInTrack,
    setTrackNotes,

    // Actions - Clips
    addClipToTrack,
    removeClipFromTrack,
    updateClipInTrack,
    splitClipInTrack,
    setTrackClips,
    getTrackClipsAtPosition,

    // Actions - Piano Roll
    expandTrack,
    collapseTrack,
    toggleTrackExpanded,
    setLastResizedNoteWidth,
    setZoomLevel,
    ZOOM_MIN,
    ZOOM_MAX,
    setZoomWheelSpeed,
    ZOOM_WHEEL_SPEED_MIN,
    ZOOM_WHEEL_SPEED_MAX,
    setActiveTrack,
    automationExpandedTrackId,
    toggleAutomationExpanded,

    // Actions - Playback
    getPlayableTracks,
    getNotesAtPosition,
    getTrackNotesAtPosition,

    // Actions - Effets (tracks + master)
    addEffect,
    removeEffect,
    reorderEffect,
    setEffectEnabled,
    updateEffectParam,

    // Actions - Automation (tracks + master)
    toggleMasterAutomationExpanded,
    addAutomationLane,
    removeAutomationLane,
    addAutomationPoint,
    updateAutomationPoint,
    removeAutomationPoint,
    setAutomationPoints,

    // Persistence
    saveToLocalStorage,
    loadFromLocalStorage,
    loadProjectData,
    exportProject,
    renameProject,
    createNewProject,

    // Utilitaires
    generateNoteId,

    // Initialisation
    initialize,
  };
});
