const toMinSec = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Formate une durée en secondes au format m:ss, "--:--" si inconnue (0/absente)
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds) return "--:--";
  return toMinSec(seconds);
};

/**
 * Formate un temps écoulé en secondes au format m:ss (0 est une valeur valide)
 */
export const formatElapsed = (seconds: number): string =>
  toMinSec(Math.max(0, seconds));
