// Freezes an AudioParam at its scheduled value at `when` and drops later
// events, so a release ramp can start from there. Firefox lacks
// cancelAndHoldAtTime: fall back to `fallbackValue`, the caller's best guess
// of the value at `when`.
export function holdParamAt(
  param: AudioParam,
  when: number,
  fallbackValue: number,
): void {
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(when);
    return;
  }
  param.cancelScheduledValues(when);
  param.setValueAtTime(fallbackValue, when);
}

// Level an attack/decay/sustain envelope has reached `elapsed` seconds after
// note start (used as the holdParamAt fallback).
export function envelopeLevelAt(
  elapsed: number,
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
): number {
  if (elapsed <= 0) return 0;
  if (attack > 0 && elapsed < attack) return (peak * elapsed) / attack;
  const sustainLevel = decay > 0 && sustain < 1 ? peak * sustain : peak;
  const sinceAttack = elapsed - attack;
  if (decay > 0 && sinceAttack < decay) {
    return peak + ((sustainLevel - peak) * sinceAttack) / decay;
  }
  return sustainLevel;
}
