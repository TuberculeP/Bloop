import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type {
  Track,
  TimelineProject,
  MidiNote,
  AudioClip,
  AudioSample,
  EQBand,
  InstrumentConfig,
  InstrumentType,
  TrackColor,
  AutomatableParam,
  AutomationLane,
  AutomationPoint,
  MasterCompressorConfig,
  MasterLimiterConfig,
} from "../lib/utils/types";
import { TRACK_COLORS } from "../lib/utils/types";
import {
  cloneEQBands,
  cloneCompressorConfig,
  cloneLimiterConfig,
  DEFAULT_COMPRESSOR_CONFIG,
  DEFAULT_LIMITER_CONFIG,
} from "../lib/audio/config";
import { useProjectStore } from "./projectStore";
import { useUiLayoutPreference } from "../composables/useUiLayoutStorage";

const STORAGE_KEY = "bloop-timeline-project";
const DEFAULT_COLS = 128; // 32 mesures
const DEFAULT_TEMPO = 120;
const DEFAULT_VOLUME = 100;
const DEFAULT_REVERB = 20;

export const useTimelineStore = defineStore("timelineStore", () => {
  // ============================================
  // État du projet
  // ============================================
  const project = ref<TimelineProject>({
    name: "Nouveau Projet",
    tracks: [],
    cols: DEFAULT_COLS,
    tempo: DEFAULT_TEMPO,
    volume: DEFAULT_VOLUME,
    reverb: DEFAULT_REVERB,
    eqBands: cloneEQBands(),
    compressor: cloneCompressorConfig(),
    limiter: cloneLimiterConfig(),
    automationLanes: [],
    version: "4.0",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ============================================
  // État de l'édition
  // ============================================
  const activeTrackId = ref<string | null>(null);
  const expandedTrackId = ref<string | null>(null);
  const automationExpandedTrackId = ref<string | null>(null);
  const automationExpandedMaster = ref(false);
  const isLoadingProject = ref(false); // Flag pour ignorer markAsChanged pendant le chargement
  const metronomeEnabled = useUiLayoutPreference("metronome-enabled", false);

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

  const volume = computed({
    get: () => project.value.volume,
    set: (value: number) => {
      project.value.volume = value;
      project.value.updatedAt = new Date();
    },
  });

  const reverb = computed({
    get: () => project.value.reverb,
    set: (value: number) => {
      project.value.reverb = value;
      project.value.updatedAt = new Date();
    },
  });

  const eqBands = computed({
    get: () => project.value.eqBands ?? cloneEQBands(),
    set: (value: EQBand[]) => {
      project.value.eqBands = value;
      project.value.updatedAt = new Date();
    },
  });

  const compressor = computed(
    () => project.value.compressor ?? DEFAULT_COMPRESSOR_CONFIG,
  );

  const limiter = computed(
    () => project.value.limiter ?? DEFAULT_LIMITER_CONFIG,
  );

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

  const generateId = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

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
      reverb: 0,
      eqBands: cloneEQBands(),
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

  const setTrackReverb = (trackId: string, reverb: number): boolean => {
    return updateTrack(trackId, { reverb: Math.max(0, Math.min(100, reverb)) });
  };

  const updateTrackEQBand = (
    trackId: string,
    bandId: string,
    gain: number,
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    const band = track.eqBands.find((b) => b.id === bandId);
    if (!band) return false;

    band.gain = gain;
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return true;
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
  // Actions - EQ
  // ============================================

  const updateEQBand = (bandId: string, gain: number): void => {
    const bands = project.value.eqBands ?? cloneEQBands();
    const band = bands.find((b) => b.id === bandId);
    if (band) {
      band.gain = gain;
      project.value.eqBands = bands;
      project.value.updatedAt = new Date();
    }
  };

  // ============================================
  // Actions - Mastering (Compresseur / Limiteur)
  // ============================================

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

  const updateCompressor = (patch: Partial<MasterCompressorConfig>): void => {
    const current = project.value.compressor ?? cloneCompressorConfig();
    const next: MasterCompressorConfig = { ...current, ...patch };
    next.threshold = clamp(next.threshold, -100, 0);
    next.ratio = clamp(next.ratio, 1, 20);
    next.attack = clamp(next.attack, 0, 1);
    next.release = clamp(next.release, 0, 1);
    next.knee = clamp(next.knee, 0, 40);
    project.value.compressor = next;
    project.value.updatedAt = new Date();
  };

  const updateLimiter = (patch: Partial<MasterLimiterConfig>): void => {
    const current = project.value.limiter ?? cloneLimiterConfig();
    const next: MasterLimiterConfig = { ...current, ...patch };
    next.threshold = clamp(next.threshold, -100, 0);
    next.release = clamp(next.release, 0, 1);
    project.value.limiter = next;
    project.value.updatedAt = new Date();
  };

  // ============================================
  // Actions - Automation Lanes
  // ============================================

  const addAutomationLane = (
    trackId: string,
    parameter: AutomatableParam,
  ): string | null => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return null;

    if (!track.automationLanes) track.automationLanes = [];

    if (track.automationLanes.some((l) => l.parameter === parameter))
      return null;

    const laneId = generateId("lane");
    const lane: AutomationLane = { id: laneId, parameter, points: [] };
    track.automationLanes.push(lane);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return laneId;
  };

  const removeAutomationLane = (trackId: string, laneId: string): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    const index =
      track.automationLanes?.findIndex((l) => l.id === laneId) ?? -1;
    if (index === -1) return false;

    track.automationLanes.splice(index, 1);
    track.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return true;
  };

  const addAutomationPoint = (
    trackId: string,
    laneId: string,
    point: Omit<AutomationPoint, "id">,
  ): string | null => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    const lane = track?.automationLanes?.find((l) => l.id === laneId);
    if (!lane) return null;

    const pointId = generateId("pt");
    lane.points.push({ ...point, id: pointId });
    lane.points.sort((a, b) => a.x - b.x);
    track!.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return pointId;
  };

  const updateAutomationPoint = (
    trackId: string,
    laneId: string,
    pointId: string,
    updates: Partial<Pick<AutomationPoint, "x" | "y">>,
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    const lane = track?.automationLanes?.find((l) => l.id === laneId);
    const point = lane?.points.find((p) => p.id === pointId);
    if (!point) return false;

    Object.assign(point, updates);
    lane!.points.sort((a, b) => a.x - b.x);
    track!.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return true;
  };

  const removeAutomationPoint = (
    trackId: string,
    laneId: string,
    pointId: string,
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    const lane = track?.automationLanes?.find((l) => l.id === laneId);
    if (!lane) return false;

    const index = lane.points.findIndex((p) => p.id === pointId);
    if (index === -1) return false;

    lane.points.splice(index, 1);
    track!.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return true;
  };

  const setAutomationPoints = (
    trackId: string,
    laneId: string,
    points: AutomationPoint[],
  ): boolean => {
    const track = project.value.tracks.find((t) => t.id === trackId);
    const lane = track?.automationLanes?.find((l) => l.id === laneId);
    if (!lane) return false;

    lane.points = [...points].sort((a, b) => a.x - b.x);
    track!.updatedAt = new Date();
    project.value.updatedAt = new Date();
    return true;
  };

  // ============================================
  // Actions - Automation Lanes (Master)
  // ============================================

  const addMasterAutomationLane = (
    parameter: AutomatableParam,
  ): string | null => {
    if (!project.value.automationLanes) project.value.automationLanes = [];

    if (project.value.automationLanes.some((l) => l.parameter === parameter))
      return null;

    const laneId = generateId("lane");
    const lane: AutomationLane = { id: laneId, parameter, points: [] };
    project.value.automationLanes.push(lane);
    project.value.updatedAt = new Date();
    return laneId;
  };

  const removeMasterAutomationLane = (laneId: string): boolean => {
    const index =
      project.value.automationLanes?.findIndex((l) => l.id === laneId) ?? -1;
    if (index === -1) return false;

    project.value.automationLanes!.splice(index, 1);
    project.value.updatedAt = new Date();
    return true;
  };

  const addMasterAutomationPoint = (
    laneId: string,
    point: Omit<AutomationPoint, "id">,
  ): string | null => {
    const lane = project.value.automationLanes?.find((l) => l.id === laneId);
    if (!lane) return null;

    const pointId = generateId("pt");
    lane.points.push({ ...point, id: pointId });
    lane.points.sort((a, b) => a.x - b.x);
    project.value.updatedAt = new Date();
    return pointId;
  };

  const updateMasterAutomationPoint = (
    laneId: string,
    pointId: string,
    updates: Partial<Pick<AutomationPoint, "x" | "y">>,
  ): boolean => {
    const lane = project.value.automationLanes?.find((l) => l.id === laneId);
    const point = lane?.points.find((p) => p.id === pointId);
    if (!point) return false;

    Object.assign(point, updates);
    lane!.points.sort((a, b) => a.x - b.x);
    project.value.updatedAt = new Date();
    return true;
  };

  const removeMasterAutomationPoint = (
    laneId: string,
    pointId: string,
  ): boolean => {
    const lane = project.value.automationLanes?.find((l) => l.id === laneId);
    if (!lane) return false;

    const index = lane.points.findIndex((p) => p.id === pointId);
    if (index === -1) return false;

    lane.points.splice(index, 1);
    project.value.updatedAt = new Date();
    return true;
  };

  const setMasterAutomationPoints = (
    laneId: string,
    points: AutomationPoint[],
  ): boolean => {
    const lane = project.value.automationLanes?.find((l) => l.id === laneId);
    if (!lane) return false;

    lane.points = [...points].sort((a, b) => a.x - b.x);
    project.value.updatedAt = new Date();
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

      // Vérifier la version - si ancienne version avec clips, on repart de zéro
      if (data.version !== "4.0") {
        console.log("Ancienne version détectée, création nouveau projet");
        isLoadingProject.value = false;
        return false;
      }

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
        // Migration: ajouter reverb et eqBands si manquants
        if (track.reverb === undefined) {
          track.reverb = 0;
        }
        if (!track.eqBands) {
          track.eqBands = cloneEQBands();
        }
        if (!track.automationLanes) {
          track.automationLanes = [];
        }
      });

      // Migration: ajouter compressor et limiter master si manquants
      if (!data.compressor) {
        data.compressor = cloneCompressorConfig();
      }
      if (!data.limiter) {
        data.limiter = cloneLimiterConfig();
      }
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
      // Migration: ajouter reverb et eqBands si manquants
      if (track.reverb === undefined) {
        track.reverb = 0;
      }
      if (!track.eqBands) {
        track.eqBands = cloneEQBands();
      }
      if (!track.automationLanes) {
        track.automationLanes = [];
      }
    });

    // S'assurer que les EQ bands globaux sont présents
    if (!data.eqBands) {
      data.eqBands = cloneEQBands();
    }
    // Migration: ajouter compressor et limiter master si manquants
    if (!data.compressor) {
      data.compressor = cloneCompressorConfig();
    }
    if (!data.limiter) {
      data.limiter = cloneLimiterConfig();
    }
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
      volume: DEFAULT_VOLUME,
      reverb: DEFAULT_REVERB,
      eqBands: cloneEQBands(),
      compressor: cloneCompressorConfig(),
      limiter: cloneLimiterConfig(),
      automationLanes: [],
      version: "4.0",
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
      saveToLocalStorage();
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
    volume,
    reverb,
    eqBands,
    compressor,
    limiter,
    masterAutomationLanes,

    // État édition
    activeTrackId,
    activeTrack,
    expandedTrackId,
    expandedTrack,
    automationExpandedMaster,
    metronomeEnabled,

    // Actions - Tracks
    createTrack,
    deleteTrack,
    updateTrack,
    renameTrack,
    setTrackMuted,
    setTrackSolo,
    setTrackVolume,
    setTrackReverb,
    updateTrackEQBand,
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
    setTrackClips,
    getTrackClipsAtPosition,

    // Actions - Piano Roll
    expandTrack,
    collapseTrack,
    toggleTrackExpanded,
    setActiveTrack,
    automationExpandedTrackId,
    toggleAutomationExpanded,

    // Actions - Playback
    getPlayableTracks,
    getNotesAtPosition,
    getTrackNotesAtPosition,

    // Actions - EQ
    updateEQBand,

    // Actions - Mastering
    updateCompressor,
    updateLimiter,

    // Actions - Automation
    addAutomationLane,
    removeAutomationLane,
    addAutomationPoint,
    updateAutomationPoint,
    removeAutomationPoint,
    setAutomationPoints,

    // Actions - Automation (Master)
    toggleMasterAutomationExpanded,
    addMasterAutomationLane,
    removeMasterAutomationLane,
    addMasterAutomationPoint,
    updateMasterAutomationPoint,
    removeMasterAutomationPoint,
    setMasterAutomationPoints,

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
