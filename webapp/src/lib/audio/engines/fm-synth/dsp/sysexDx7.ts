// Port de sysex-dx7.js (dx7-synth-js, MIT, Matt Montag)
// Parse un DX7 SysEx Bulk Data Bank (32 voix) — voir
// http://homepages.abdn.ac.uk/mth192/pages/dx7/sysex-format.txt (Section F)
import type { Dx7Operator, Dx7Patch } from "../../../../utils/types";

export function extractPatchFromRom(
  bankData: Uint8Array,
  patchId: number,
): Dx7Patch {
  const dataStart = 128 * patchId + 6;
  const voiceData = bankData.subarray(dataStart, dataStart + 128);
  const operators: Dx7Operator[] = [];

  for (let i = 5; i >= 0; --i) {
    const oscStart = (5 - i) * 17;
    const b = (offset: number) => voiceData[oscStart + offset];

    operators[i] = {
      idx: i,
      enabled: true,
      rates: [b(0), b(1), b(2), b(3)],
      levels: [b(4), b(5), b(6), b(7)],
      detune: Math.floor(b(12) >> 3) - 7,
      velocitySens: b(13) >> 2,
      lfoAmpModSens: b(13) & 3,
      volume: b(14),
      oscMode: (b(15) & 1) as 0 | 1,
      freqCoarse: Math.floor(b(15) >> 1),
      freqFine: b(16),
      pan: (((i + 1) % 3) - 1) * 25, // panning alterné: -25, 0, 25, -25, 0, 25
    };
  }

  return {
    algorithm: voiceData[110] + 1, // 1-indexé pour lisibilité
    feedback: voiceData[111] & 7,
    name: String.fromCharCode(...voiceData.subarray(118, 128)).trim(),
    lfoSpeed: voiceData[112],
    lfoDelay: voiceData[113],
    lfoPitchModDepth: voiceData[114],
    lfoAmpModDepth: voiceData[115],
    lfoPitchModSens: voiceData[116] >> 4,
    lfoWaveform: Math.floor(voiceData[116] >> 1) & 7,
    operators,
  };
}

// Attend un Bulk Dump SysEx DX7 pour 32 voix (en-tête 6 octets inclus).
export function loadBank(bankData: Uint8Array): Dx7Patch[] {
  const presets: Dx7Patch[] = [];
  for (let i = 0; i < 32; i++) {
    presets.push(extractPatchFromRom(bankData, i));
  }
  return presets;
}
