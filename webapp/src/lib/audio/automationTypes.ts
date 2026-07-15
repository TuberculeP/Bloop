import type { EffectChain } from "./effects";

export interface TrackChannel {
  trackId: string;
  gainNode: GainNode;
  effectsChain: EffectChain;
}
