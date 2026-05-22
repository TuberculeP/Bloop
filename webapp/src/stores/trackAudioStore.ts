import { defineStore } from "pinia";
import { ref, watch, markRaw, type WatchStopHandle } from "vue";
import { useTimelineStore } from "./timelineStore";
import { useAudioBusStore } from "./audioBusStore";
import type { EngineState, InstrumentEngine } from "../lib/audio/engines/types";
import type {
  AudioClip,
  InstrumentConfig,
  NoteName,
  Track,
  EQBand,
} from "../lib/utils/types";
import { useAudioLibraryStore } from "./audioLibraryStore";
import { AudioClipEngine } from "../lib/audio/engines/audio-clip";
import { createInstrumentEngine } from "../lib/audio/instrumentFactory";
import { createImpulseResponse, createEQFilter } from "../lib/audio/config";
import { applyAutomationToChannel } from "../lib/audio/automation";
import type { AutomatableParam } from "../lib/utils/types";

interface TrackChannel {
  trackId: string;
  gainNode: GainNode;
  eqFilters: Map<string, BiquadFilterNode>;
  eqChain: BiquadFilterNode[];
  dryGain: GainNode;
  wetGain: GainNode;
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

  // Convolver partagé pour la reverb de toutes les pistes
  const trackConvolver = markRaw(audioContext.createConvolver());
  const trackReverbBoost = markRaw(audioContext.createGain());
  trackConvolver.buffer = createImpulseResponse(audioContext);
  trackReverbBoost.gain.value = 1.5;
  trackConvolver.connect(trackReverbBoost).connect(inputBus);

  const createTrackChannel = (track: Track): TrackChannel => {
    // Volume principal
    const gainNode = markRaw(audioContext.createGain());
    gainNode.gain.value = track.volume / 100;

    // EQ 5 bandes
    const eqFilters = new Map<string, BiquadFilterNode>();
    const eqChain: BiquadFilterNode[] = [];

    for (const band of track.eqBands ?? []) {
      const filter = markRaw(createEQFilter(audioContext, band));
      eqFilters.set(band.id, filter);
      eqChain.push(filter);
    }

    // Dry/Wet pour reverb
    const dryGain = markRaw(audioContext.createGain());
    const wetGain = markRaw(audioContext.createGain());
    const reverbAmount = (track.reverb ?? 0) / 100;
    dryGain.gain.value = 1 - reverbAmount * 0.5;
    wetGain.gain.value = reverbAmount;

    // Chaîne audio: gainNode → EQ filters → dry/wet split
    if (eqChain.length > 0) {
      gainNode.connect(eqChain[0]);
      eqChain.reduce((prev, curr) => (prev.connect(curr), curr));
      const lastFilter = eqChain[eqChain.length - 1];
      lastFilter.connect(dryGain);
      lastFilter.connect(wetGain);
    } else {
      gainNode.connect(dryGain);
      gainNode.connect(wetGain);
    }
    dryGain.connect(inputBus);
    wetGain.connect(trackConvolver);

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
      eqFilters,
      eqChain,
      dryGain,
      wetGain,
      engine,
      unsubscribeState,
    };

    trackChannels.value.set(track.id, channel);

    engine.preload();

    return channel;
  };

  const removeTrackChannel = (trackId: string): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.unsubscribeState();
      channel.engine.dispose();
      // Déconnecter toute la chaîne audio
      channel.gainNode.disconnect();
      for (const filter of channel.eqChain) {
        filter.disconnect();
      }
      channel.dryGain.disconnect();
      channel.wetGain.disconnect();
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

    const stepsPerSecond = (timelineStore.tempo / 60) * 4;
    const offsetInSeconds =
      (clip.startOffset + playbackOffsetColumns) / stepsPerSecond;
    const durationInSeconds = (clip.w - playbackOffsetColumns) / stepsPerSecond;

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

  const updateTrackVolume = (trackId: string, volume: number): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      const normalizedVolume = Math.max(0.001, volume / 100);
      channel.gainNode.gain.exponentialRampToValueAtTime(
        normalizedVolume,
        audioContext.currentTime + 0.05,
      );
    }
  };

  const updateTrackReverb = (trackId: string, reverb: number): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      const reverbAmount = reverb / 100;
      const dryValue = Math.max(0.001, 1 - reverbAmount * 0.5);

      channel.dryGain.gain.exponentialRampToValueAtTime(
        dryValue,
        audioContext.currentTime + 0.05,
      );

      // Pour wetGain: si 0, utiliser setValueAtTime (exponentialRamp ne peut pas atteindre 0)
      if (reverbAmount === 0) {
        channel.wetGain.gain.setValueAtTime(0, audioContext.currentTime);
      } else {
        channel.wetGain.gain.exponentialRampToValueAtTime(
          reverbAmount,
          audioContext.currentTime + 0.05,
        );
      }
    }
  };

  const updateTrackEQBand = (
    trackId: string,
    bandId: string,
    gain: number,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      const filter = channel.eqFilters.get(bandId);
      if (filter && Number.isFinite(gain)) {
        filter.gain.setValueAtTime(gain, audioContext.currentTime);
      }
    }
  };

  const updateTrackEQBands = (trackId: string, bands: EQBand[]): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      for (const band of bands) {
        const filter = channel.eqFilters.get(band.id);
        if (filter && Number.isFinite(band.gain)) {
          filter.gain.setValueAtTime(band.gain, audioContext.currentTime);
        }
      }
    }
  };

  const updateTrackInstrument = (
    trackId: string,
    config: Partial<InstrumentConfig>,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      channel.engine.updateConfig(config);
    }
  };

  const applyAutomation = (
    trackId: string,
    param: AutomatableParam,
    normalizedValue: number,
  ): void => {
    const channel = trackChannels.value.get(trackId);
    if (channel) {
      applyAutomationToChannel(param, normalizedValue, channel, audioContext);
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

    // Watcher pour les volumes individuels
    watcherStopHandles.push(
      watch(
        () => timelineStore.tracks.map((t) => ({ id: t.id, volume: t.volume })),
        (tracksVolumes) => {
          for (const { id, volume } of tracksVolumes) {
            updateTrackVolume(id, volume);
          }
        },
        { deep: true },
      ),
    );

    // Watcher pour la reverb par piste
    watcherStopHandles.push(
      watch(
        () => timelineStore.tracks.map((t) => ({ id: t.id, reverb: t.reverb })),
        (tracksReverbs) => {
          for (const { id, reverb } of tracksReverbs) {
            updateTrackReverb(id, reverb ?? 0);
          }
        },
        { deep: true },
      ),
    );

    // Watcher pour l'EQ par piste
    watcherStopHandles.push(
      watch(
        () =>
          timelineStore.tracks.map((t) => ({ id: t.id, eqBands: t.eqBands })),
        (tracksEQs) => {
          for (const { id, eqBands } of tracksEQs) {
            if (eqBands) {
              updateTrackEQBands(id, eqBands);
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
    updateTrackReverb,
    updateTrackEQBand,
    updateTrackEQBands,
    updateTrackInstrument,
    applyAutomation,

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
