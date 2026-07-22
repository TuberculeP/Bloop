import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";
import { useSequencerStore } from "./sequencerStore";
import { useTimelineStore } from "./timelineStore";
import { EffectChain } from "../lib/audio/effects";
import { applyAutomationToChannel } from "../lib/audio/automation";
import type { AutomationTarget, TimeSignature } from "../lib/utils/types";
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

  const audioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )();
  const inputBus = audioContext.createGain();
  const masterGain = audioContext.createGain();
  const effectsOutput = audioContext.createGain();

  inputBus.gain.value = 1;
  masterGain.gain.value = 1;
  effectsOutput.gain.value = 1;

  // Chaîne de mastering :
  // inputBus -> masterGain (volume) -> pile d'effets réordonnable -> destination
  inputBus.connect(masterGain);
  const effectsChain = new EffectChain(audioContext, masterGain, effectsOutput);
  effectsChain.rebuild(timelineStore.project.effects ?? []);
  effectsOutput.connect(audioContext.destination);

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

  // Watcher structurel : ajout/suppression/réordre/bypass d'un effet du bus
  // master -> rebuild complet de la chaîne (voir EffectChain.rebuild). Le
  // sequencerStore legacy n'a jamais eu de pile d'effets (compressor/limiter
  // étaient déjà master-only via timelineStore.project) : pas de fallback
  // activeStore nécessaire ici, comme pour les anciens watchers
  // compressor/limiter.
  watch(
    () =>
      (timelineStore.project.effects ?? [])
        .map((e) => `${e.id}:${e.type}:${e.enabled}`)
        .join("|"),
    () => effectsChain.rebuild(timelineStore.project.effects ?? []),
  );

  // Watcher des valeurs de param (pas de rebuild)
  watch(
    () => timelineStore.project.effects,
    (effects) => {
      for (const effect of effects ?? []) {
        for (const [paramId, value] of Object.entries(effect.params)) {
          const descriptor = effectsChain.getParamDescriptor(
            effect.id,
            paramId,
          );
          if (!descriptor) continue;
          if (descriptor.audioParam) {
            descriptor.audioParam.setValueAtTime(
              value,
              audioContext.currentTime,
            );
          } else {
            descriptor.setValue?.(value, audioContext);
          }
        }
      }
    },
    { deep: true },
  );

  const ensureAudioContextResumed = async () => {
    if (audioContext.state === "suspended") await audioContext.resume();
  };

  // Capture PCM brute pour l'export : on tape la sortie de la pile d'effets
  // (plutôt qu'un node nommé en dur comme l'ancien `limiter`, qui n'était pas
  // garanti d'être le dernier node une fois la pile réordonnable) et plutôt
  // que de passer par un MediaRecorder (qui ré-encoderait en Opus/AAC,
  // empilant une compression lossy inutile avant l'encodage WAV/MP3 final).
  const PCM_CAPTURE_BUFFER_SIZE = 4096;
  const PCM_CAPTURE_CHANNELS = 2;
  let captureProcessor: ScriptProcessorNode | null = null;
  let captureSilentGain: GainNode | null = null;
  let captureChunks: Float32Array[][] = [];

  const startPcmCapture = (): void => {
    captureChunks = Array.from({ length: PCM_CAPTURE_CHANNELS }, () => []);
    captureProcessor = audioContext.createScriptProcessor(
      PCM_CAPTURE_BUFFER_SIZE,
      PCM_CAPTURE_CHANNELS,
      PCM_CAPTURE_CHANNELS,
    );
    captureProcessor.onaudioprocess = (event) => {
      for (let ch = 0; ch < PCM_CAPTURE_CHANNELS; ch++) {
        captureChunks[ch].push(
          new Float32Array(event.inputBuffer.getChannelData(ch)),
        );
      }
    };

    // ScriptProcessorNode ne déclenche onaudioprocess que s'il est connecté
    // à une destination : on le branche via un gain à 0 pour ne pas dupliquer
    // le son en sortie audible.
    captureSilentGain = audioContext.createGain();
    captureSilentGain.gain.value = 0;
    effectsOutput.connect(captureProcessor);
    captureProcessor.connect(captureSilentGain);
    captureSilentGain.connect(audioContext.destination);
  };

  const stopPcmCapture = (): AudioBuffer => {
    if (captureProcessor) {
      effectsOutput.disconnect(captureProcessor);
      captureProcessor.disconnect();
    }
    captureSilentGain?.disconnect();
    captureProcessor = null;
    captureSilentGain = null;

    const totalLength =
      captureChunks[0]?.reduce((sum, chunk) => sum + chunk.length, 0) ?? 0;
    const buffer = audioContext.createBuffer(
      PCM_CAPTURE_CHANNELS,
      Math.max(totalLength, 1),
      audioContext.sampleRate,
    );

    for (let ch = 0; ch < PCM_CAPTURE_CHANNELS; ch++) {
      const channelData = buffer.getChannelData(ch);
      let offset = 0;
      for (const chunk of captureChunks[ch] ?? []) {
        channelData.set(chunk, offset);
        offset += chunk.length;
      }
    }

    captureChunks = [];
    return buffer;
  };

  // Channel virtuel du bus master, au même format que les TrackChannel par
  // piste, pour réutiliser applyAutomationToChannel telle quelle.
  const masterChannel: TrackChannel = {
    trackId: "master",
    gainNode: masterGain,
    effectsChain,
  };

  const applyMasterAutomation = (
    target: AutomationTarget,
    value: number,
  ): void => {
    applyAutomationToChannel(target, value, masterChannel, audioContext);
  };

  const notifyMasterEffectsBeatBoundary = (
    tick: number,
    timeSignature: TimeSignature,
    tempo: number,
  ): void => {
    effectsChain.notifyBeatBoundary(tick, timeSignature, tempo);
  };

  return {
    audioContext,
    inputBus,
    isInitialized,
    ensureAudioContextResumed,
    startPcmCapture,
    stopPcmCapture,
    applyMasterAutomation,
    notifyMasterEffectsBeatBoundary,
  };
});
