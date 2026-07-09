import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";
import { useSequencerStore } from "./sequencerStore";
import { useTimelineStore } from "./timelineStore";
import {
  createImpulseResponse,
  createEQFilter,
  DEFAULT_EQ_BANDS,
  DEFAULT_COMPRESSOR_CONFIG,
  DEFAULT_LIMITER_CONFIG,
} from "../lib/audio/config";
import { applyAutomationToChannel } from "../lib/audio/automation";
import type {
  MasterCompressorConfig,
  MasterLimiterConfig,
  AutomatableParam,
} from "../lib/utils/types";
import type { TrackChannel } from "../lib/audio/automationTypes";

export const useAudioBusStore = defineStore("audioBusStore", () => {
  const sequencerStore = useSequencerStore();
  const timelineStore = useTimelineStore();

  // Use timelineStore if it has tracks, otherwise fall back to sequencerStore
  const activeStore = computed(() => {
    if (timelineStore.tracks.length > 0) {
      return timelineStore;
    }
    return sequencerStore;
  });

  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const inputBus = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  const masterGain = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const reverbBoost = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  const sumBus = audioContext.createGain();
  const limiter = audioContext.createDynamicsCompressor();

  inputBus.gain.value = 1;
  masterGain.gain.value = 1;
  dryGain.gain.value = 1;
  wetGain.gain.value = 0;
  reverbBoost.gain.value = 1.5;
  sumBus.gain.value = 1;
  convolver.buffer = createImpulseResponse(audioContext);

  const eqFilters = new Map<string, BiquadFilterNode>();
  const filters = DEFAULT_EQ_BANDS.map((band) => {
    const filter = createEQFilter(audioContext, band);
    eqFilters.set(band.id, filter);
    return filter;
  });

  // Chaîne de mastering :
  // inputBus → EQ → compressor → masterGain (volume) → [dry + wet reverb] → sumBus → limiter → destination
  inputBus.connect(filters[0]);
  filters.reduce((prev, curr) => (prev.connect(curr), curr));
  filters[filters.length - 1].connect(compressor);
  compressor.connect(masterGain);

  masterGain.connect(dryGain).connect(sumBus);
  masterGain
    .connect(convolver)
    .connect(reverbBoost)
    .connect(wetGain)
    .connect(sumBus);

  sumBus.connect(limiter).connect(audioContext.destination);

  const isInitialized = ref(true);

  const setGain = (node: GainNode, value: number) => {
    if (!Number.isFinite(value)) return;
    const v = value === 0 ? 0.001 : value;
    node.gain.exponentialRampToValueAtTime(v, audioContext.currentTime + 0.05);
  };

  watch(
    () => activeStore.value.volume,
    (v) => setGain(masterGain, v / 100),
    { immediate: true },
  );
  // Reverb master : s'ajoute aux reverbs par-piste (sends + reverb de bus, comme un vrai DAW)
  watch(
    () => activeStore.value.reverb,
    (v) => setGain(wetGain, v / 100),
    { immediate: true },
  );
  watch(
    [() => activeStore.value, () => activeStore.value.eqBands],
    ([, bands]) =>
      bands.forEach((b) => {
        const f = eqFilters.get(b.id);
        if (f && Number.isFinite(b.gain))
          f.gain.setValueAtTime(b.gain, audioContext.currentTime);
      }),
    { immediate: true, deep: true },
  );

  const applyCompressor = (config: MasterCompressorConfig) => {
    const t = audioContext.currentTime;
    if (!config.enabled) {
      // Bypass transparent : ratio 1:1, aucune réduction de gain
      compressor.threshold.setValueAtTime(0, t);
      compressor.ratio.setValueAtTime(1, t);
      compressor.knee.setValueAtTime(0, t);
      return;
    }
    compressor.threshold.setValueAtTime(config.threshold, t);
    compressor.ratio.setValueAtTime(config.ratio, t);
    compressor.attack.setValueAtTime(config.attack, t);
    compressor.release.setValueAtTime(config.release, t);
    compressor.knee.setValueAtTime(config.knee, t);
  };

  const applyLimiter = (config: MasterLimiterConfig) => {
    const t = audioContext.currentTime;
    if (!config.enabled) {
      limiter.threshold.setValueAtTime(0, t);
      limiter.ratio.setValueAtTime(1, t);
      return;
    }
    // Limiteur = compresseur configuré en brickwall (knee dur, ratio élevé, attack quasi instantané)
    limiter.threshold.setValueAtTime(config.threshold, t);
    limiter.ratio.setValueAtTime(20, t);
    limiter.knee.setValueAtTime(0, t);
    limiter.attack.setValueAtTime(0.001, t);
    limiter.release.setValueAtTime(config.release, t);
  };

  watch(
    () => timelineStore.project.compressor,
    (config) => applyCompressor(config ?? DEFAULT_COMPRESSOR_CONFIG),
    { immediate: true, deep: true },
  );
  watch(
    () => timelineStore.project.limiter,
    (config) => applyLimiter(config ?? DEFAULT_LIMITER_CONFIG),
    { immediate: true, deep: true },
  );

  const ensureAudioContextResumed = async () => {
    if (audioContext.state === "suspended") await audioContext.resume();
  };

  const createCaptureStream = (): MediaStream => {
    const dest = audioContext.createMediaStreamDestination();
    limiter.connect(dest);
    return dest.stream;
  };

  // Channel virtuel du bus master, au même format que les TrackChannel par piste,
  // pour réutiliser applyAutomationToChannel telle quelle (volume/reverb/EQ).
  const masterChannel: TrackChannel = {
    trackId: "master",
    gainNode: masterGain,
    eqFilters,
    eqChain: filters,
    dryGain,
    wetGain,
  };

  const applyMasterAutomation = (
    param: AutomatableParam,
    value: number,
  ): void => {
    applyAutomationToChannel(param, value, masterChannel, audioContext);
  };

  return {
    audioContext,
    inputBus,
    isInitialized,
    ensureAudioContextResumed,
    createCaptureStream,
    applyMasterAutomation,
  };
});
