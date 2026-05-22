import type { AutomatableParam, AutomationPoint } from "../utils/types";
import type { TrackChannel } from "./automationTypes";

export interface AutomationParamConfig {
  label: string;
  shortLabel: string;
  unit: string;
  // Converts normalizedValue (0-1) to the display value
  toDisplay: (normalized: number) => string;
}

export const AUTOMATABLE_PARAMS: Record<
  AutomatableParam,
  AutomationParamConfig
> = {
  volume: {
    label: "Volume",
    shortLabel: "Vol",
    unit: "%",
    toDisplay: (v) => `${Math.round(v * 100)}%`,
  },
  reverb: {
    label: "Reverb",
    shortLabel: "Rvb",
    unit: "%",
    toDisplay: (v) => `${Math.round(v * 100)}%`,
  },
  eq_sub: {
    label: "EQ Sub",
    shortLabel: "Sub",
    unit: "dB",
    toDisplay: (v) => `${Math.round(v * 36 - 18)}dB`,
  },
  eq_bass: {
    label: "EQ Bass",
    shortLabel: "Bass",
    unit: "dB",
    toDisplay: (v) => `${Math.round(v * 36 - 18)}dB`,
  },
  eq_mid: {
    label: "EQ Mid",
    shortLabel: "Mid",
    unit: "dB",
    toDisplay: (v) => `${Math.round(v * 36 - 18)}dB`,
  },
  eq_presence: {
    label: "EQ Presence",
    shortLabel: "Pres",
    unit: "dB",
    toDisplay: (v) => `${Math.round(v * 36 - 18)}dB`,
  },
  eq_brilliance: {
    label: "EQ Brilliance",
    shortLabel: "Bril",
    unit: "dB",
    toDisplay: (v) => `${Math.round(v * 36 - 18)}dB`,
  },
};

function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}

export function getAutomationValueAt(
  points: AutomationPoint[],
  x: number,
): number {
  if (points.length === 0) return 0.5;

  const sorted = [...points].sort((a, b) => a.x - b.x);

  if (x <= sorted[0].x) return sorted[0].y;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

  const rightIdx = sorted.findIndex((p) => p.x > x);
  const p1 = sorted[rightIdx - 1];
  const p2 = sorted[rightIdx];

  // Clamp neighboring points for Catmull-Rom tangent calculation
  const p0 = sorted[rightIdx - 2] ?? p1;
  const p3 = sorted[rightIdx + 1] ?? p2;

  const t = (x - p1.x) / (p2.x - p1.x);
  const value = catmullRom(p0.y, p1.y, p2.y, p3.y, t);

  return Math.max(0, Math.min(1, value));
}

export function applyAutomationToChannel(
  param: AutomatableParam,
  normalizedValue: number,
  channel: TrackChannel,
  audioCtx: AudioContext,
): void {
  const now = audioCtx.currentTime;
  const smoothTime = 0.01;

  switch (param) {
    case "volume": {
      const gain = Math.max(0.001, normalizedValue);
      channel.gainNode.gain.setTargetAtTime(gain, now, smoothTime);
      break;
    }
    case "reverb": {
      const reverbAmount = normalizedValue;
      const dryValue = Math.max(0.001, 1 - reverbAmount * 0.5);
      channel.dryGain.gain.setTargetAtTime(dryValue, now, smoothTime);
      if (reverbAmount < 0.001) {
        channel.wetGain.gain.setValueAtTime(0, now);
      } else {
        channel.wetGain.gain.setTargetAtTime(reverbAmount, now, smoothTime);
      }
      break;
    }
    case "eq_sub":
    case "eq_bass":
    case "eq_mid":
    case "eq_presence":
    case "eq_brilliance": {
      const bandId = param.replace("eq_", "");
      const filter = channel.eqFilters.get(bandId);
      if (filter) {
        const db = normalizedValue * 36 - 18;
        filter.gain.setTargetAtTime(db, now, smoothTime);
      }
      break;
    }
  }
}
