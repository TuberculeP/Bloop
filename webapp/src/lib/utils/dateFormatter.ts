/**
 * Utilitaire de formatage des dates
 */

/**
 * Formate une date pour l'affichage dans les messages/conversations
 * Affiche l'heure pour aujourd'hui, "Hier" pour hier, le jour de la semaine pour < 7 jours, sinon la date
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "long" });
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  }
};

/**
 * Formate une date complète pour l'affichage dans les posts
 */
export const formatFullDate = (dateString?: string): string => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
