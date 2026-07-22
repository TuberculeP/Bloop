import type { EffectChain } from "./effects";

export interface TrackChannel {
  trackId: string;
  gainNode: GainNode;
  panNode?: StereoPannerNode; // absent pour le bus master (pas de pan master)
  effectsChain: EffectChain;
}
