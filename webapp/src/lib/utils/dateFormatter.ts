/**
 * Utilitaire de formatage des dates
 */

/**
 * Formate une date complète sans l'heure (ex: articles Learning)
 */
export const formatLongDate = (dateString?: string | null): string => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Formate une date courte
 */
export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
