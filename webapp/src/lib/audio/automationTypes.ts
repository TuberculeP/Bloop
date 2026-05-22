export interface TrackChannel {
  trackId: string;
  gainNode: GainNode;
  eqFilters: Map<string, BiquadFilterNode>;
  eqChain: BiquadFilterNode[];
  dryGain: GainNode;
  wetGain: GainNode;
}
