import { defineStore } from "pinia";
import { ref, watch, markRaw, type WatchStopHandle } from "vue";
import { useTimelineStore } from "./timelineStore";
import { useAudioBusStore } from "./audioBusStore";
import type { EngineState, InstrumentEngine } from "../lib/audio/engines/types";
import type {
  AudioClip,
  AutomationTarget,
  InstrumentConfig,
  InstrumentConfigUpdate,
  NoteName,
  TimeSignature,
  Track,
} from "../lib/utils/types";
import { useAudioLibraryStore } from "./audioLibraryStore";
import { AudioClipEngine } from "../lib/audio/engines/audio-clip";
import { SamplePlayerEngine } from "../lib/audio/engines/sample-player";
import { createInstrumentEngine } from "../lib/audio/instrumentFactory";
import { EffectChain } from "../lib/audio/effects";
import { applyAutomationToChannel } from "../lib/audio/automation";
import { ticksPerSecond } from "../lib/audio/timeGrid";

interface TrackChannel {
  trackId: string;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  effectsChain: EffectChain;
  engine: InstrumentEngine;
  unsubscribeState: () => void;
}

export const useTrackAudioStore = defineStore("trackAudioStore", () => {
  const timelineStore = useTimelineStore();
  const audioBusStore = useAudioBusStore();

  const trackChannels = ref<Map<string, TrackChannel>>(new Map());
  const trackEngineStates = ref<Map<string, EngineState>>(new Map());
  const isInitialized = ref(false);
  const watcherStopHandles: WatchStopHandle[] = [];

  const { audioContext, inputBus, ensureAudioContextResumed } = audioBusStore;

  const createTrackChannel = (track: Track): TrackChannel => {
    // Volume principal — 0.001 si la piste est mute ou rendue silencieuse
    // par le solo d'une autre, pour ne jamais démarrer audible (voir
    // updateTrackVolume ci-dessous pour le même calcul en cours de lecture).
    const isPlayable = timelineStore
      .getPlayableTracks()
      .some((t) => t.id === track.id);
    const gainNode = markRaw(audioContext.createGain());
    gainNode.gain.value = isPlayable ? track.volume / 100 : 0.001;

    // Pan — fader de channel strip au même titre que le volume, hors de la
    // pile d'effets. -127..127 (convention musicale) -> -1..1 (StereoPannerNode).
    const panNode = markRaw(audioContext.createStereoPanner());
    panNode.pan.value = track.pan / 127;
    gainNode.connect(panNode);

    // Pile d'effets réordonnable (EQ, reverb, etc.) : gainNode -> pan -> effets -> inputBus
    const effectsChain = markRaw(
      new EffectChain(audioContext, panNode, inputBus),
    );
    effectsChain.rebuild(track.effects);

    const engine = markRaw(
      createInstrumentEngine(audioContext, gainNode, track.instrument),
    );

    trackEngineStates.value.set(track.id, engine.state);

    const unsubscribeState = engine.onStateChange((newState) => {
      trackEngineStates.value.set(track.id, newState);
    });

    const channel: TrackChannel = {
      trackId: track.id,
      gainNode,
      panNode,
      effectsChain,
      engine,
      unsubscribeState,
    };

    trackChannels.value.set(track.id, channel);

    engine.preload();

    if (
      engine instanceof SamplePlayerEngine &&
      track.instrument.type === "samplePlayer"
    ) {
      resolveSamplePlayerBuffer(track.id, track.instrument.sampleId);
    }

    return channel;
  };

  // Résout un sampleId en AudioBuffer via audioLibraryStore (fetch CDN +
  // cache IndexedDB + décodage, cf. audioLibraryStore.loadSample) et
  // l'injecte dans l'engine — c'est le seul pont entre le monde "store"
  // et le SamplePlayerEngine, qui ne connaît jamais audioLibraryStore.
  const resolveSamplePlayerBuffer = async (
    trackId: string,
    sampleId: string | null,
  ): Promise<void> => {
    const channel = trackChannels.value.get(trackId);
    if (!channel || !(channel.engine instanceof SamplePlayerEngine)) return;
    const engine = channel.engine;

    if (!sampleId) {
      engine.setBuffer(null);
      return;
    }

    engine.setLoading();
    const audioLibraryStore = useAudioLibraryStore();
    const buffer = await audioLibraryStore.loadSample(sampleId);

    // La piste/l'engine a pu être supprimé(e) ou le sample re-changé entre-temps
    const currentChannel = trackChannels.value.get(trackId);
    if (currentChannel?.engine !== engine) return;
    engine.setBuffer(buffer);
  };

  const removeTrackChannel = (trackId: string): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.unsubscribeState();
      channel.engine.dispose();
      channel.effectsChain.dispose();
      channel.gainNode.disconnect();
      channel.panNode.disconnect();
      trackChannels.value.delete(trackId);
      trackEngineStates.value.delete(trackId);
    }
  };

  const getOrCreateChannel = (track: Track): TrackChannel => {
    let channel = trackChannels.value.get(track.id);
    if (!channel) {
      channel = createTrackChannel(track);
    }
    return channel;
  };

  const playNoteOnTrack = (
    trackId: string,
    noteName: NoteName,
    noteId: string,
    velocity: number = 100,
  ): void => {
    ensureAudioContextResumed();

    const track = timelineStore.tracks.find((t) => t.id === trackId);
    if (!track) {
      console.warn(`Track not found: ${trackId}`);
      return;
    }

    // Vérifier mute/solo
    const hasSolo = timelineStore.tracks.some((t) => t.solo);
    if (track.muted || (hasSolo && !track.solo)) {
      return;
    }

    const channel = getOrCreateChannel(track);
    channel.engine.playNote(noteName, noteId, velocity);
  };

  const stopNoteOnTrack = (trackId: string, noteId: string): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.engine.stopNote(noteId);
    }
  };

  const stopAllNotesOnTrack = (trackId: string): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.engine.stopAllNotes();
    }
  };

  const stopAllNotes = (): void => {
    for (const channel of trackChannels.value.values()) {
      channel.engine.stopAllNotes();
    }
  };

  // ============================================
  // Audio Clip Methods
  // ============================================

  const playClipOnTrack = async (
    trackId: string,
    clip: AudioClip,
    playbackOffsetColumns: number = 0,
  ): Promise<void> => {
    await ensureAudioContextResumed();

    const track = timelineStore.tracks.find((t) => t.id === trackId);
    if (!track) {
      console.warn(`Track not found: ${trackId}`);
      return;
    }

    if (track.instrument.type !== "audioTrack") {
      console.warn(`Track ${trackId} is not an audio track`);
      return;
    }

    const hasSolo = timelineStore.tracks.some((t) => t.solo);
    if (track.muted || (hasSolo && !track.solo)) {
      return;
    }

    const channel = getOrCreateChannel(track);
    const engine = channel.engine;

    if (!(engine instanceof AudioClipEngine)) {
      console.warn(`Track ${trackId} engine is not an AudioClipEngine`);
      return;
    }

    const audioLibraryStore = useAudioLibraryStore();
    const buffer = await audioLibraryStore.loadSample(clip.sampleId);

    if (!buffer) {
      console.warn(`Failed to load sample: ${clip.sampleId}`);
      return;
    }

    const tickRate = ticksPerSecond(timelineStore.tempo);
    const offsetInSeconds =
      (clip.startOffset + playbackOffsetColumns) / tickRate;
    const durationInSeconds = (clip.w - playbackOffsetColumns) / tickRate;

    engine.playClip(clip.id, buffer, offsetInSeconds, durationInSeconds);
  };

  const stopClipOnTrack = (trackId: string, clipId: string): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel && channel.engine instanceof AudioClipEngine) {
      channel.engine.stopClip(clipId);
    }
  };

  const stopAllClipsOnTrack = (trackId: string): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel && channel.engine instanceof AudioClipEngine) {
      channel.engine.stopAllClips();
    }
  };

  const stopAllClips = (): void => {
    for (const channel of trackChannels.value.values()) {
      if (channel.engine instanceof AudioClipEngine) {
        channel.engine.stopAllClips();
      }
    }
  };

  const updateTrackVolume = (
    trackId: string,
    volume: number,
    isPlayable: boolean,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      // 0.001 : même plancher que celui déjà utilisé pour volume=0. Couper
      // le gain ici coupe immédiatement tout son en cours — notes ET clips
      // audio sont tous deux routés à travers ce même gainNode (Engine ->
      // gainNode -> effets -> inputBus) — sans avoir à traquer/arrêter
      // individuellement chaque source active à chaque mute/solo.
      const normalizedVolume = isPlayable
        ? Math.max(0.001, volume / 100)
        : 0.001;
      channel.gainNode.gain.exponentialRampToValueAtTime(
        normalizedVolume,
        audioContext.currentTime + 0.05,
      );
    }
  };

  const updateTrackPan = (trackId: string, pan: number): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.panNode.pan.linearRampToValueAtTime(
        pan / 127,
        audioContext.currentTime + 0.05,
      );
    }
  };

  // Rebuild complet de la pile d'effets (ajout/suppression/réordre/bypass) —
  // rare comparé aux mises à jour de valeurs de param, cf. les deux watchers
  // séparés dans `initialize()`.
  const updateTrackEffects = (
    trackId: string,
    effects: Track["effects"],
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.effectsChain.rebuild(effects);
    }
  };

  const updateTrackEffectParam = (
    trackId: string,
    effectId: string,
    paramId: string,
    value: number,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (!channel) return;
    const descriptor = channel.effectsChain.getParamDescriptor(
      effectId,
      paramId,
    );
    if (!descriptor) return;
    if (descriptor.audioParam) {
      descriptor.audioParam.setValueAtTime(value, audioContext.currentTime);
    } else {
      descriptor.setValue?.(value, audioContext);
    }
  };

  const updateTrackInstrument = (
    trackId: string,
    config: Partial<InstrumentConfig>,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.engine.updateConfig(config);
      const sampleId = (config as InstrumentConfigUpdate).sampleId;
      if (
        channel.engine instanceof SamplePlayerEngine &&
        sampleId !== undefined
      ) {
        resolveSamplePlayerBuffer(trackId, sampleId);
      }
    }
  };

  const applyAutomation = (
    trackId: string,
    target: AutomationTarget,
    normalizedValue: number,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      applyAutomationToChannel(target, normalizedValue, channel, audioContext);
    }
  };

  const notifyTrackEffectsBeatBoundary = (
    tick: number,
    timeSignature: TimeSignature,
    tempo: number,
  ): void => {
    for (const track of timelineStore.getPlayableTracks()) {
      const channel = trackChannels.value.get(track.id);
      channel?.effectsChain.notifyBeatBoundary(tick, timeSignature, tempo);
    }
  };

  const getTrackEngineState = (trackId: string): EngineState => {
    return trackEngineStates.value.get(trackId) ?? "idle";
  };

  const getEngine = (trackId: string): InstrumentEngine | null => {
    return trackChannels.value.get(trackId)?.engine ?? null;
  };

  const preloadTrack = async (trackId: string): Promise<void> => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      await channel.engine.preload();
    }
  };

  const syncTracksWithStore = (): void => {
    const storeTrackIds = new Set(timelineStore.tracks.map((t) => t.id));
    const channelTrackIds = new Set(trackChannels.value.keys());

    // Supprimer les channels pour les pistes qui n'existent plus
    for (const trackId of channelTrackIds) {
      if (!storeTrackIds.has(trackId)) {
        removeTrackChannel(trackId);
      }
    }

    // Créer les channels pour les nouvelles pistes
    for (const track of timelineStore.tracks) {
      if (!trackChannels.value.has(track.id)) {
        createTrackChannel(track);
      }
    }
  };

  const initialize = (): void => {
    if (isInitialized.value) return;

    // Restaurer les métadonnées des samples utilisés par le projet AVANT de
    // synchroniser les pistes ci-dessous : un Sample Player résout son sample
    // dès la création de son channel (syncTracksWithStore), donc restaurer
    // ces métadonnées après aurait été une course perdue d'avance.
    if (timelineStore.project.usedSamples) {
      useAudioLibraryStore().restoreSamples(timelineStore.project.usedSamples);
    }

    // Synchroniser avec les pistes existantes
    syncTracksWithStore();

    // Watcher pour synchroniser quand les pistes changent
    watcherStopHandles.push(
      watch(
        () => timelineStore.tracks,
        () => syncTracksWithStore(),
        { deep: true },
      ),
    );

    // Watcher unifié volume + mute/solo : le gain effectif d'une piste
    // dépend des trois à la fois (un mute ou un solo d'une autre piste doit
    // couper le son immédiatement, y compris les notes/clips déjà en train
    // de jouer, sans attendre leur fin naturelle). Un seul watcher/writer
    // évite qu'un watcher de volume et un watcher de mute/solo séparés ne
    // s'écrasent l'un l'autre. Recalcule TOUTES les pistes à chaque
    // changement : un solo togglé sur une piste change l'état "playable" de
    // toutes les autres, pas seulement de celle-ci.
    watcherStopHandles.push(
      watch(
        () =>
          timelineStore.tracks.map((t) => ({
            id: t.id,
            volume: t.volume,
            muted: t.muted,
            solo: t.solo,
          })),
        () => {
          const playableIds = new Set(
            timelineStore.getPlayableTracks().map((t) => t.id),
          );
          for (const t of timelineStore.tracks) {
            updateTrackVolume(t.id, t.volume, playableIds.has(t.id));
          }
        },
        { deep: true },
      ),
    );

    // Watcher pan : séparé du watcher volume+mute+solo ci-dessus, le pan
    // n'a pas d'impact sur l'état "playable" des autres pistes.
    watcherStopHandles.push(
      watch(
        () => timelineStore.tracks.map((t) => ({ id: t.id, pan: t.pan })),
        (tracksPan) => {
          for (const { id, pan } of tracksPan) {
            updateTrackPan(id, pan);
          }
        },
        { deep: true },
      ),
    );

    // Watcher structurel : ajout/suppression/réordre/bypass d'un effet ->
    // rebuild complet de la chaîne. Scindé du watcher de valeurs ci-dessous
    // pour ne pas reconstruire tout le graphe à chaque simple changement de
    // param (voir EffectChain.rebuild).
    watcherStopHandles.push(
      watch(
        () =>
          timelineStore.tracks.map((t) => ({
            id: t.id,
            signature: t.effects
              .map((e) => `${e.id}:${e.type}:${e.enabled}`)
              .join("|"),
          })),
        () => {
          for (const track of timelineStore.tracks) {
            updateTrackEffects(track.id, track.effects);
          }
        },
        { deep: true },
      ),
    );

    // Watcher des valeurs de param (pas de rebuild)
    watcherStopHandles.push(
      watch(
        () =>
          timelineStore.tracks.map((t) => ({ id: t.id, effects: t.effects })),
        (tracksEffects) => {
          for (const { id, effects } of tracksEffects) {
            for (const effect of effects) {
              for (const [paramId, value] of Object.entries(effect.params)) {
                updateTrackEffectParam(id, effect.id, paramId, value);
              }
            }
          }
        },
        { deep: true },
      ),
    );

    isInitialized.value = true;
  };

  const dispose = (): void => {
    // Unsubscribe tous les watchers
    for (const stopHandle of watcherStopHandles) {
      stopHandle();
    }
    watcherStopHandles.length = 0;

    // Supprimer tous les channels
    for (const trackId of trackChannels.value.keys()) {
      removeTrackChannel(trackId);
    }
    isInitialized.value = false;
  };

  return {
    trackChannels,
    trackEngineStates,
    isInitialized,

    playNoteOnTrack,
    stopNoteOnTrack,
    stopAllNotesOnTrack,
    stopAllNotes,

    playClipOnTrack,
    stopClipOnTrack,
    stopAllClipsOnTrack,
    stopAllClips,

    updateTrackVolume,
    updateTrackPan,
    updateTrackEffects,
    updateTrackEffectParam,
    updateTrackInstrument,
    applyAutomation,
    notifyTrackEffectsBeatBoundary,

    getTrackEngineState,
    getEngine,
    preloadTrack,

    createTrackChannel,
    removeTrackChannel,
    syncTracksWithStore,

    initialize,
    dispose,
  };
});
