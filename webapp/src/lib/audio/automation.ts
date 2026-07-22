import type { AutomationPoint, AutomationTarget } from "../utils/types";
import type { TrackChannel } from "./automationTypes";

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

// `points` doit déjà être trié par x — invariant maintenu par le store
// (updateAutomationPoint/setAutomationPoints trient à chaque mutation) et par
// les appelants (automationLaneRenderer pré-trie avant d'appeler). Retrier
// ici coûterait un O(n log n) répété des milliers de fois par frame de
// playback (une lane par piste, 60x/s) ou par rendu de courbe (steps par
// rendu).
export function getAutomationValueAt(
  points: AutomationPoint[],
  x: number,
): number {
  if (points.length === 0) return 0.5;

  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  const rightIdx = points.findIndex((p) => p.x > x);
  const p1 = points[rightIdx - 1];
  const p2 = points[rightIdx];

  // Clamp neighboring points for Catmull-Rom tangent calculation
  const p0 = points[rightIdx - 2] ?? p1;
  const p3 = points[rightIdx + 1] ?? p2;

  const t = (x - p1.x) / (p2.x - p1.x);
  const value = catmullRom(p0.y, p1.y, p2.y, p3.y, t);

  return Math.max(0, Math.min(1, value));
}

// Résout la cible d'automation contre la chaîne d'effets vivante du channel :
// le cas "channel"/"volume"/"pan" est un pseudo-effet réservé au fader (hors
// de la pile d'effets, voir AutomationTarget), tout le reste passe par le
// descripteur de paramètre exposé par l'EffectInstance visée.
export function applyAutomationToChannel(
  target: AutomationTarget,
  normalizedValue: number,
  channel: TrackChannel,
  audioCtx: AudioContext,
): void {
  const now = audioCtx.currentTime;
  const smoothTime = 0.01;

  if (target.effectId === "channel") {
    if (target.paramId === "pan") {
      if (!channel.panNode) return;
      const pan = normalizedValue * 2 - 1; // 0-1 -> -1..1
      channel.panNode.pan.setTargetAtTime(pan, now, smoothTime);
      return;
    }
    const gain = Math.max(0.001, normalizedValue);
    channel.gainNode.gain.setTargetAtTime(gain, now, smoothTime);
    return;
  }

  const descriptor = channel.effectsChain.getParamDescriptor(
    target.effectId,
    target.paramId,
  );
  if (!descriptor) return;

  const value =
    descriptor.min + normalizedValue * (descriptor.max - descriptor.min);

  if (descriptor.audioParam) {
    descriptor.audioParam.setTargetAtTime(value, now, smoothTime);
  } else {
    descriptor.setValue?.(value, audioCtx);
  }
}
